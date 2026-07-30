const fs = require('fs');
const path = require('path');

const srcImg = 'C:/Users/famil/.gemini/antigravity/brain/8fff0f61-00f1-4282-b4c5-33d50ef4978b/.user_uploaded/media__1784630192965.png';
const destJs = 'c:/Users/famil/OneDrive/Desktop/rishi/frontend/src/assets/qrCodeData.js';

const b64 = fs.readFileSync(srcImg).toString('base64');
const content = `export const phonepeQrBase64 = "data:image/png;base64,${b64}";\n`;

fs.writeFileSync(destJs, content, 'utf8');
console.log('✅ Base64 QR code asset generated successfully at:', destJs);
