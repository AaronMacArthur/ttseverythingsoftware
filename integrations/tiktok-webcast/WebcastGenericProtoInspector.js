"use strict";

const { extractVisibleUtf8Strings } = require("./WebcastFrameRouter");

class WebcastGenericProtoInspector {
  constructor(options = {}) {
    this.maxDepth = Math.max(0, Number(options.maxDepth) || 4);
    this.maxBytes = Math.max(64, Number(options.maxBytes) || 128 * 1024);
    this.maxErrors = Math.max(1, Number(options.maxErrors) || 25);
    this.maxFields = Math.max(1, Number(options.maxFields) || 500);
  }

  inspect(buffer, options = {}) {
    const source = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
    const limit = Math.min(source.length, this.maxBytes, Number(options.maxBytes) || this.maxBytes);
    return this.inspectSlice(source.subarray(0, limit), 0);
  }

  inspectSlice(buffer, depth) {
    const fields = [];
    const visibleStrings = new Set(extractVisibleUtf8Strings(buffer, { maxStrings: 80 }));
    const parseErrors = [];
    let offset = 0;

    while (offset < buffer.length && fields.length < this.maxFields) {
      const fieldOffset = offset;
      const tag = readVarint(buffer, offset);
      if (!tag) {
        parseErrors.push(`Unable to read tag at offset ${offset}.`);
        break;
      }
      offset = tag.nextOffset;
      const tagValue = tag.value;
      const fieldNumber = Number(tagValue >> 3n);
      const wireType = Number(tagValue & 7n);
      if (!fieldNumber) {
        parseErrors.push(`Invalid field number at offset ${fieldOffset}.`);
        break;
      }

      const field = { fieldNumber, wireType, offset: fieldOffset, length: 0 };
      if (wireType === 0) {
        const value = readVarint(buffer, offset);
        if (!value) {
          parseErrors.push(`Unable to read varint field ${fieldNumber} at offset ${offset}.`);
          break;
        }
        offset = value.nextOffset;
        field.length = offset - fieldOffset;
        field.value = { kind: "varint", value: value.value.toString() };
        fields.push(field);
      } else if (wireType === 1) {
        if (offset + 8 > buffer.length) {
          parseErrors.push(`Fixed64 field ${fieldNumber} exceeds buffer length.`);
          break;
        }
        const bytes = buffer.subarray(offset, offset + 8);
        offset += 8;
        field.length = offset - fieldOffset;
        field.value = { kind: "fixed64", valueHex: bytes.toString("hex") };
        fields.push(field);
      } else if (wireType === 2) {
        const len = readVarint(buffer, offset);
        if (!len) {
          parseErrors.push(`Unable to read length field ${fieldNumber} at offset ${offset}.`);
          break;
        }
        offset = len.nextOffset;
        const byteLength = Number(len.value);
        if (!Number.isSafeInteger(byteLength) || byteLength < 0 || offset + byteLength > buffer.length) {
          parseErrors.push(`Length-delimited field ${fieldNumber} has invalid length ${byteLength}.`);
          break;
        }
        const bytes = buffer.subarray(offset, offset + byteLength);
        offset += byteLength;
        field.length = offset - fieldOffset;
        const utf8 = decodeUtf8(bytes);
        if (utf8) {
          visibleStrings.add(utf8);
        }
        const value = { kind: "bytes", base64: bytes.toString("base64") };
        if (utf8) {
          value.utf8 = utf8;
        }
        if (depth < this.maxDepth && looksLikeNestedProto(bytes)) {
          const nested = this.inspectSlice(bytes, depth + 1);
          if (nested.fields.length) {
            value.nested = nested;
            for (const text of nested.visibleStrings) {
              visibleStrings.add(text);
            }
          }
        }
        field.value = value;
        fields.push(field);
      } else if (wireType === 5) {
        if (offset + 4 > buffer.length) {
          parseErrors.push(`Fixed32 field ${fieldNumber} exceeds buffer length.`);
          break;
        }
        const bytes = buffer.subarray(offset, offset + 4);
        offset += 4;
        field.length = offset - fieldOffset;
        field.value = { kind: "fixed32", valueHex: bytes.toString("hex") };
        fields.push(field);
      } else {
        parseErrors.push(`Unsupported wire type ${wireType} at offset ${fieldOffset}.`);
        break;
      }

      if (parseErrors.length >= this.maxErrors) {
        parseErrors.push("Parse error limit reached.");
        break;
      }
    }

    return {
      fields,
      visibleStrings: [...visibleStrings].filter(Boolean).slice(0, 100),
      parseErrors: parseErrors.slice(0, this.maxErrors)
    };
  }
}

function readVarint(buffer, offset) {
  let value = 0n;
  let shift = 0n;
  for (let index = offset; index < buffer.length && index < offset + 10; index += 1) {
    const byte = BigInt(buffer[index]);
    value |= (byte & 0x7fn) << shift;
    if ((byte & 0x80n) === 0n) {
      return { value, nextOffset: index + 1 };
    }
    shift += 7n;
  }
  return null;
}

function decodeUtf8(bytes) {
  if (!bytes.length) {
    return "";
  }
  const text = bytes.toString("utf8").replace(/\0/g, "").trim();
  if (!text || text.length > 300) {
    return "";
  }
  if (!/[\p{L}\p{N}]/u.test(text)) {
    return "";
  }
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  return replacementCount > 1 ? "" : text;
}

function looksLikeNestedProto(bytes) {
  if (bytes.length < 2 || bytes.length > 64 * 1024) {
    return false;
  }
  const tag = readVarint(bytes, 0);
  if (!tag) {
    return false;
  }
  const fieldNumber = Number(tag.value >> 3n);
  const wireType = Number(tag.value & 7n);
  return fieldNumber > 0 && [0, 1, 2, 5].includes(wireType);
}

module.exports = {
  WebcastGenericProtoInspector,
  readVarint,
  looksLikeNestedProto
};
