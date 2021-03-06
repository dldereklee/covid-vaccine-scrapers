const sites = require("../data/sites.json");
const https = require("https");

module.exports = async function GetAvailableAppointments() {
    console.log("NatickMall starting.");
    const webData = await ScrapeWebsiteData();
    console.log("NatickMall done.");
    return {
        ...sites.NatickMall,
        ...webData,
        timestamp: new Date(),
    };
};

async function ScrapeWebsiteData() {
    const tokenUrl =
        "https://home.color.com/api/v1/get_onsite_claim?partner=natickmall";
    // Get a request token
    const tokenPromise = new Promise((resolve) => {
        https
            .get(tokenUrl, (res) => {
                let body = "";
                res.on("data", (chunk) => {
                    body += chunk;
                });
                res.on("end", () => {
                    resolve(body);
                });
            })
            .on("error", (e) => {
                console.error(
                    "Error making token request for the Natick Mall" + e
                );
            })
            .end();
    });
    const tokenResponse = await tokenPromise;
    const responseJson = JSON.parse(tokenResponse);
    const token = responseJson["token"];
    const availabilityUrl = `https://home.color.com/api/v1/vaccination_appointments/availability?claim_token=${token}&collection_site=Natick%20Mall`;
    const availabilityPromise = new Promise((resolve) => {
        https
            .get(availabilityUrl, (res) => {
                let body = "";
                res.on("data", (chunk) => {
                    body += chunk;
                });
                res.on("end", () => {
                    resolve(body);
                });
            })
            .on("error", (e) => {
                console.error(
                    "Error making token request for the Natick Mall" + e
                );
            })
            .end();
    });

    const availabilityResponse = await availabilityPromise;
    const availability = JSON.parse(availabilityResponse);
    const results = { availability: {}, hasAvailability: false };
    // Collect availability count by date
    availability.reduce((memo, currentValue) => {
        /* The availability returns and array of appointments like this:
            {
                "start": "2021-02-22T14:00:00+00:00",
                "end": "2021-02-22T14:04:00+00:00",
                "capacity": 1,
                "remaining_spaces": -1
            }
        */
        let remainingSpaces = currentValue["remaining_spaces"];
        if (remainingSpaces > 0) {
            appointmentDateGMT = new Date(currentValue["start"]);
            appointmentDateET = appointmentDateGMT.toLocaleString("en-US", {
                timeZone: "America/New_York",
            });
            appointmentDateET = appointmentDateET.substring(
                0,
                appointmentDateET.indexOf(",")
            );
            dateAvailability = memo["availability"][appointmentDateET];
            if (!dateAvailability) {
                dateAvailability = {
                    numberAvailableAppointments: 0,
                    hasAvailability: false,
                };
                memo["availability"][appointmentDateET] = dateAvailability;
            }
            dateAvailability["availability"] += remainingSpaces;
            dateAvailability["hasAvailability"] = true;
            memo["hasAvailability"] = true;
        }
        return memo;
    }, results);

    return results;
}
