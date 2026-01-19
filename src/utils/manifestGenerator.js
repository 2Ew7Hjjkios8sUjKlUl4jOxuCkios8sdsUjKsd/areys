import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { getDirectUrl } from "./urlHelper";
import { fetchTemplate } from "./fileFetcher";

/**
 * Generates a flight manifest using a Docx template.
 * @param {Array} passengers - Array of selected passenger objects.
 * @param {string} templateUrl - Path to the docx template.
 * @param {object} flightInfo - Flight metadata (route, date)
 */
export const generateManifest = async (passengers, templateUrl, flightInfo = {}) => {
    try {
        const directUrl = getDirectUrl(templateUrl);

        // Use robust fetcher (handles proxy)
        const response = await fetchTemplate(directUrl);

        const content = await response.arrayBuffer();

        // Basic signature check
        const uint8Array = new Uint8Array(content);
        if (uint8Array.length < 4 || uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
            throw new Error("The downloaded file is not a valid DOCX/ZIP file. Check the URL.");
        }

        const zip = new PizZip(content);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        const data = {
            flightDate: flightInfo.date || passengers[0]?.date || "-",
            flightNumber: flightInfo.flightNumber || "-",
            route: flightInfo.route || "-",
            passengers: passengers.map((p, index) => {
                const isChild = p.type === 'Child';
                const salutation = isChild ? 'CH' : (p.gender === 'F' ? 'MRS' : 'MR');

                const infantTotal = (p.infants?.length || 0) * (p.infantPrice || p.infant_price || 0);
                const basePriceCost = (p.type === 'Child' ? (p.childPrice || p.child_price || 0) : (p.adultPrice || p.adult_price || 0));
                const realPrice = basePriceCost + infantTotal;

                return {
                    _index: index + 1,
                    name: `${salutation} ${(p.name || "").toUpperCase()}`,
                    gender: isChild ? "CH" : (p.gender || "M"),
                    phoneNumber: p.phoneNumber || "-",
                    infants: (p.infants || []).map(i => `IFNT ${i.toUpperCase()}`).join("\n"),
                    place: flightInfo.route || p.route || "CDD-MUQ",
                    agency: p.agency || "-",
                    price: realPrice > 0 ? `$${realPrice}` : "-",
                    Tax: p.tax ? `$${p.tax}` : "-",
                    Surcharge: p.surcharge ? `$${p.surcharge}` : "-",
                    TotalPrice: p.total_price || p.totalPrice ? `$${p.total_price || p.totalPrice}` : "-"
                };
            })
        };

        try {
            doc.render(data);
        } catch (error) {
            console.error("Manifest Rendering error details:", error);
            if (error.properties && error.properties.errors instanceof Array) {
                const errorMessages = error.properties.errors.map(e => e.properties.explanation).join("\n");
                throw new Error("Manifest Template Error:\n" + errorMessages);
            }
            throw error;
        }

        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            compression: "DEFLATE",
        });

        // Validation: Ensure the blob is valid before saving
        if (!out || out.size < 100) {
            throw new Error("Generated manifest is empty or corrupt.");
        }

        const timestamp = new Date().getTime();
        const fileName = `Flight_Manifest_${timestamp}.docx`;
        console.log(`Saving manifest as: ${fileName}, Size: ${out.size} bytes`);

        saveAs(out, fileName);

        return { success: true };
    } catch (error) {
        console.error("CRITICAL MANIFEST ERROR:", error);
        return { success: false, error: error.message };
    }
};
