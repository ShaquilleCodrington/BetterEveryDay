const fs = require("fs");
const path = require("path");
const pngToIco = require("png-to-ico").default;

const iconDir = __dirname;

const files = [
  "16x16.png",
  "32x32.png",
  "48x48.png",
  "256x256.png",
];

const images = files.map((file) => path.join(iconDir, file));

pngToIco(images)
  .then((buffer) => {
    const output = path.join(__dirname, "icon.ico");

    fs.writeFileSync(output, buffer);

    console.log(`Created: ${output}`);
  })
  .catch((error) => {
    console.error("Failed to create icon:", error);
    process.exit(1);
  });