import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { getDirectUrl } from "./urlHelper";
import { fetchTemplate } from "./fileFetcher";

/**
 * Generates a batch of tickets in a single Word document.
 * @param {Array} passengers - Array of passenger objects.
 * @param {string} templateUrl - Path to the docx template.
 * @param {object} flightInfo - Flight metadata (airline, flightNumber, route, date)
 */

const formatDateToDMY = (dateStr) => {
    if (!dateStr) return "";
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // Return as is if invalid
        const d = date.getDate();
        const m = date.getMonth() + 1;
        const y = date.getFullYear();
        return `${d}-${m}-${y}`;
    } catch {
        return dateStr;
    }
};

export const generateTickets = async (passengers, templateUrl = "/template.docx", flightInfo = {}) => {
    try {
        const directUrl = getDirectUrl(templateUrl);

        // Use robust fetcher (handles proxy)
        const response = await fetchTemplate(directUrl);

        const content = await response.arrayBuffer();

        // Basic signature check for ZIP (PK..)
        const uint8Array = new Uint8Array(content);
        if (uint8Array.length < 4 || uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
            throw new Error("The downloaded file is not a valid DOCX/ZIP file. Check the URL.");
        }

        const zip = new PizZip(content);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: (part) => {
                console.warn(`Tag not found: ${part.value}`);
                return "";
            },
        });

        const data = {
            passengers: passengers.map((p, index) => {
                const infants = p.infants || [];
                const infantData = {};
                for (let i = 1; i <= 5; i++) {
                    const infantName = infants[i - 1];
                    infantData[`IFNT${i}`] = infantName ? `IFNT ${infantName.toUpperCase()}` : "";
                }

                const isChild = p.type === 'Child';
                const salutation = isChild ? 'CH' : (p.gender === 'F' ? 'MRS' : 'MR');
                const formattedName = `${salutation} ${(p.name || "").toUpperCase()}`;

                const baseRate = isChild ? (p.childPrice || p.child_price || 90) : (p.adultPrice || p.adult_price || 130);
                const infantRate = p.infantPrice || p.infant_price || 20;
                const infantTotal = infants.length * infantRate;
                const totalBasePrice = baseRate + infantTotal;

                return {
                    name: formattedName,
                    ...infantData,
                    infantList: infants.map(name => ({ name: `IFNT ${name.toUpperCase()}` })),
                    isLast: index === passengers.length - 1,
                    Date: formatDateToDMY(flightInfo.date || p.date || ""),
                    price: `$${totalBasePrice}`,
                    Tax: `$${p.tax || 0}`,
                    Surcharge: `$${p.surcharge || 0}`,
                    TotalPrice: `$${p.totalPrice || 0}`,
                    bookingrefrence: p.bookingReference || "",
                    FlightNumber: flightInfo.flightNumber || p.flightNumber || "",
                    airline: flightInfo.airline || p.airline,
                    route: flightInfo.route || p.route || "",
                    agency: p.agency || "-",
                    dateofissue: formatDateToDMY(p.date_of_issue || p.dateOfIssue || ""),
                };
            })
        };

        console.log("Generating batch for passengers:", passengers.length);

        try {
            doc.render(data);
        } catch (error) {
            console.error("Rendering error details:", error);
            if (error.properties && error.properties.errors instanceof Array) {
                const errorMessages = error.properties.errors.map(e => e.properties.explanation).join("\n");
                throw new Error("Template Tag Error:\n" + errorMessages);
            }
            throw error;
        }

        const zipOutput = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            compression: "DEFLATE",
        });

        const timestamp = new Date().getTime();
        saveAs(zipOutput, `Tickets_Batch_${timestamp}.docx`);
        return { success: true };
    } catch (error) {
        console.error("Critical Generation Error:", error);
        return { success: false, error: error.message };
    }
};
