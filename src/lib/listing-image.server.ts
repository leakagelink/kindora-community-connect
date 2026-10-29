import { decode as decodeJpeg, encode as encodeJpeg } from "jpeg-js";
import { decode as decodePng, encode as encodePng } from "fast-png";

export function normalizeListingImage(bytes: Uint8Array) {
  if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) throw new Error("Images must be under 5 MB.");
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
    if (bytes.length < 33) throw new Error("Invalid PNG image.");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16), height = view.getUint32(20);
    if (!width || !height || width * height > 4_000_000 || width > 4096 || height > 4096) throw new Error("Images must be no larger than 4 megapixels.");
    const image = decodePng(bytes, { checkCrc: true });
    return { bytes: encodePng({ width: image.width, height: image.height, data: image.data, depth: image.depth, channels: image.channels, ...(image.palette ? { palette: image.palette } : {}), ...(image.transparency ? { transparency: image.transparency } : {}) }), type: "image/png", extension: "png" };
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    const image = decodeJpeg(bytes, { useTArray: true, maxResolutionInMP: 4, maxMemoryUsageInMB: 64, tolerantDecoding: false });
    return { bytes: new Uint8Array(encodeJpeg(image, 85).data), type: "image/jpeg", extension: "jpg" };
  }
  throw new Error("Upload a valid JPG or PNG image.");
}