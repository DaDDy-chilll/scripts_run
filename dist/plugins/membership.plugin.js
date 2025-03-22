"use strict";
const moment = require('moment');
module.exports = function membershipStatusPlugin(schema, options) {
    schema.virtual('membership_status').get(function () {
        const removeTime = (date) => {
            return moment
                .utc(date)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        };
        if (this.last_customer_type != null) {
            const today = removeTime(Date.now());
            const lpd = removeTime(this.last_purchased_date);
            const exp = removeTime(this.expiration_date);
            const isValid = today.isSameOrAfter(lpd) && today.isSameOrBefore(exp);
            return isValid ? 'valid' : 'expired';
        }
        return '';
    });
};
