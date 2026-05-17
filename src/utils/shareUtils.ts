// Shared WhatsApp + native share helpers.
// IMPORTANT: never call api.whatsapp.com (browsers block it). Use wa.me only.

export const openWhatsApp = (phone: string, message: string) => {
  const cleaned = phone.replace(/[^0-9]/g, "");
  const encoded = encodeURIComponent(message);
  const number = cleaned.startsWith("91") || cleaned.length > 10 ? cleaned : `91${cleaned}`;
  window.open(`https://wa.me/${number}?text=${encoded}`, "_blank", "noopener,noreferrer");
};

export const shareViaWhatsApp = (message: string) => {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  );
};

export const nativeShare = async (title: string, text: string, url?: string) => {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      console.log("Share cancelled");
      return false;
    }
  }
  shareViaWhatsApp(`${text}\n${url || (typeof window !== "undefined" ? window.location.href : "")}`);
  return true;
};

export const contactSeller = (phone: string, itemName: string, type: "buy" | "sell") => {
  const message =
    type === "buy"
      ? `नमस्ते! मुझे ${itemName} खरीदना है। क्या आप उपलब्ध हैं? (FarmSmart AI से)`
      : `नमस्ते! मेरे पास ${itemName} बेचने के लिए है। क्या आप रुचि रखते हैं? (FarmSmart AI से)`;
  openWhatsApp(phone, message);
};

export const shareDiseaseReport = (
  cropType: string,
  disease: string,
  treatment: string,
  confidence: number,
) => {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const message = `🌿 FarmSmart AI - रोग रिपोर्ट
━━━━━━━━━━━━━━━
🌾 फसल: ${cropType}
🦠 रोग: ${disease}
📊 विश्वास: ${confidence}%
━━━━━━━━━━━━━━━
💊 उपचार: ${treatment}
━━━━━━━━━━━━━━━
📱 FarmSmart AI द्वारा
${url}`;
  return nativeShare("FarmSmart AI - रोग रिपोर्ट", message);
};

export const shareCropSuggestion = (cropName: string, profit: number, matchScore: number) => {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const message = `🌾 FarmSmart AI - फसल सुझाव
━━━━━━━━━━━━━━━
✅ सुझाई फसल: ${cropName}
💰 अनुमानित मुनाफा: ₹${profit}/एकड़
📊 मिलान: ${matchScore}%
━━━━━━━━━━━━━━━
AI ने मौसम + मिट्टी + बाज़ार देखकर सुझाया
📱 FarmSmart AI - किसान का AI सहायक
${url}`;
  return nativeShare("FarmSmart AI - फसल सुझाव", message);
};

export const shareApp = () => {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const message = `🌾 FarmSmart AI - किसान का AI सहायक!
━━━━━━━━━━━━━━━
✅ फसल की बीमारी पहचानें
✅ कौन सी फसल उगाएं
✅ मंडी भाव देखें
✅ खाद-बीज खरीदें
━━━━━━━━━━━━━━━
बिल्कुल FREE! कोई download नहीं
बस link खोलें 👇
${url}`;
  return nativeShare("FarmSmart AI", message);
};
