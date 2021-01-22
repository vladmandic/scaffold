
  /*
  Scaffold
  homepage: <https://github.com/vladmandic/scaffold>
  author: <https://github.com/vladmandic>'
  */

async function n(...o){if(!o)return;let t=new Date,a=`${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}:${t.getSeconds().toString().padStart(2,"0")}.${t.getMilliseconds().toString().padStart(3,"0")}`;console.log(a,...o)}async function r(){n(navigator)}window.onload=r;
//# sourceMappingURL=index.js.map
