/* eslint-disable no-console */

async function get(item) {
  let http = null;
  const res = await fetch(item);
  if (res && res.ok) http = await res.text();
  try { http = JSON.parse(http); } catch { /**/ }
  return http;
}

async function log(msg) {
  get(`api/sys/log?msg=${msg}`);
  console.log(msg);
}

const color = {
  white: (str) => `<font color="white">${str}</font>`,
  green: (str) => `<font color="lightgreen">${str}</font>`,
  coral: (str) => `<font color="lightcoral">${str}</font>`,
  blue: (str) => `<font color="lightblue">${str}</font>`,
  yellow: (str) => `<font color="lightyellow">${str}</font>`,
  grey: (str) => `<font color="lightgray">${str}</font>`,
  hex: (str, hex) => `<font color="#${hex}">${str}</font>`,
  ok: (str, bool) => (bool ? `<font color="lightgreen">${str}</font>` : `<font color="lightcoral">${str}</font>`),
};

export { log, get, color };
