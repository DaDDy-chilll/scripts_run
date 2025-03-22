const mongoose = require("mongoose");
const csv = require("csv-parser");
const fs = require("fs");
const Patient = require("./model/Patient.model");
const PlaceCode = require("./model/PlaceCode.model");
const stringSimilarity = require("string-similarity");
const moment = require("moment");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// Make this file a module to avoid redeclaration issues
export {};

mongoose.connect(
  "mongodb+srv://ytdevaccess:cTQzn8n4HQwjafmw@cluster0.n6tvi.mongodb.net/yinthway?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

async function importData() {
  const placeCodeList = await getAllPCode();
  const results: any[] = [];
  const errorRows: any[] = [];
  const resultRows: any[] = [];
  fs.createReadStream("data.csv")
    .pipe(csv())
    .on("data", (data: any) => results.push(data))
    .on("end", async () => {
      for (const [index, row] of results.entries()) {
        try {
          // Check if Township is defined
          if (!row.township) {
            console.warn(
              `Skipping row with missing Township: ${JSON.stringify(row)}`
            );
            errorRows.push({
              no: index + 1,
              ...row,
              error: "Missing Township",
            });
            continue;
          }

          const dob = parseDate(row["dob"]);
          if (!dob) {
            console.warn(
              `Skipping row with invalid Date of Birth: ${JSON.stringify(row)}`
            );
            errorRows.push({ no: index + 1, ...row, error: "Invalid DOB" });
            continue;
          }
          const incomingTownship = row.township.toLowerCase().trim();
          const matchedTownship = findClosestTownship(
            incomingTownship,
            placeCodeList
          );

          if (!matchedTownship) {
            console.warn(`No matching township found for: ${incomingTownship}`);
            errorRows.push({
              no: index + 1,
              ...row,
              error: "No Matching Township",
            });
            continue;
          }

          if (!row.name || !row["phone_number"]) {
            console.warn(
              `Skipping row with missing Name or Phone Number: ${JSON.stringify(
                row
              )}`
            );
            errorRows.push({
              no: index + 1,
              ...row,
              error: "Missing Name or Phone Number",
            });
            continue;
          }

          if (matchedTownship) {
            const newHn = await generateUniqueHN();
            const patient = new Patient({
              hn: newHn,
              name: row.name,
              dob: dob.toISOString(),
              gender: "male", // Adjust as needed
              contact_numbers: [row["phone_number"]],
              use_nw_hn: true,
              consultant: null,
              past_history: null,
              g6pd: false,
              past_diagnosis: "Select..",
              caretaker: "U",
              anthropometry_date_for_weight: null,
              anthropometry_date_for_height: null,
              address: {
                sr: {
                  p_code: "MMR013",
                  name: "Yangon",
                },
                township: {
                  name: matchedTownship.name,
                  p_code: matchedTownship.p_code,
                },
              },
            });
            // console.log('patient',patient)
            // await patient.save();
            resultRows.push({ Name: row.name, hn: newHn });
            console.log(`Patient ${row.Name} saved successfully....!`);
          } else {
            console.warn(`No matching township found for: ${incomingTownship}`);
          }
        } catch (error) {
          console.error(`Error processing row: ${JSON.stringify(row)}`, error);
        }
      }

      if (errorRows.length > 0) {
        await exportErrorsToCSV(errorRows);
      }

      if (resultRows.length > 0) {
        await exportResutlToCSV(resultRows);
      }

      console.log("Data import completed");
      mongoose.connection.close();
    });
}

async function getAllPCode() {
  const placeCodes = await PlaceCode.find({}, "p_code name");
  return placeCodes.map(({ name, p_code }: any) => ({
    name: name.toLowerCase().trim(),
    p_code,
  }));
}

function findClosestTownship(incomingTownship: any, placeCodeList: any) {
  const normalize = (str: any) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9 ]/g, "");
  const normalizedTownship = normalize(incomingTownship);
  const townshipNames = placeCodeList.map((item: any) => item.name);
  const matches = stringSimilarity.findBestMatch(
    normalizedTownship,
    townshipNames
  );

  // Get the best match
  const bestMatch = matches.bestMatch;

  // Set a threshold for similarity (e.g., 0.6 or 60%)
  if (bestMatch.rating > 0.5) {
    const matchedIndex = townshipNames.indexOf(bestMatch.target);
    return placeCodeList[matchedIndex];
  }

  return null; // No close match found
}

function parseDate(dateString: any) {
  if (!dateString) return null;

  // Trim any leading/trailing whitespace
  dateString = dateString.trim();
  dateString = dateString.replace(/\/+/g, "/");

  // Define possible date formats
  const dateFormats = [
    "DD.MM.YYYY", // e.g., 23.5.2022
    "D.M.YYYY", // e.g., 1.3.2021
    "DD/MM/YYYY", // e.g., 23/05/2022
    "D/M/YYYY", // e.g., 1/3/2021
    "MM/DD/YYYY", // e.g., 05/22/2019
    "M/D/YYYY", // e.g., 5/22/2019
    "DD-MMM-YYYY", // e.g., 30-Aug-2020
    "D-MMM-YYYY", // e.g., 1-Jan-2020
    "YYYY-MM-DD", // e.g., 2020-08-30 (ISO format)
  ];

  // Try parsing the date using the defined formats
  const parsedDate = moment(dateString, dateFormats, true); // `true` enables strict parsing

  if (parsedDate.isValid()) {
    return parsedDate.toDate();
  }

  return null;
}

async function generateUniqueHN() {
  const thisYear = moment.utc().year();
  const yy = thisYear.toString().slice(-2);

  let newHn = parseInt(`9${yy}000000`, 10);

  let patientWithSameHn = await Patient.findOne({ hn: newHn });

  while (patientWithSameHn) {
    newHn += 1;
    patientWithSameHn = await Patient.findOne({ hn: newHn });
  }

  return newHn;
}

async function exportErrorsToCSV(errorRows: any) {
  const csvWriter = createCsvWriter({
    path: "error_data.csv",
    header: [
      { id: "no", title: "No" },
      { id: "Name", title: "Name" },
      { id: "dob", title: "DOB" },
      { id: "Phone Number", title: "Phone Number" },
      { id: "township", title: "Township" },
      { id: "error", title: "Error Message" },
    ],
  });

  await csvWriter.writeRecords(errorRows);
  console.log("Error data exported to error_data.csv");
}

async function exportResutlToCSV(errorRows: any) {
  const csvWriter = createCsvWriter({
    path: "result_data.csv",
    header: [
      { id: "Name", title: "Name" },
      { id: "hn", title: "HN" },
    ],
  });

  await csvWriter.writeRecords(errorRows);
  console.log("Result data exported to result_data.csv");
}

importData();
