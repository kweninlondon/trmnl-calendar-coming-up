const { chromium }=require('playwright');
const fs=require('fs'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH} : {})});const page=await browser.newPage();
 const source=fs.readFileSync('layouts/full.html','utf8');
 const css=source.match(/<style>([\s\S]*?)<\/style>/)[1];
 const script=source.match(/<script>([\s\S]*?)<\/script>/)[1];
 const rows=Array.from({length:15},(_,i)=>(i===0||i===5?'<tr class="section"><th colspan="3">Group</th></tr>':'')+(i===5?'<tr class="group-gap"><td colspan="3"></td></tr>':'')+`<tr class="event-row"><td>Wed 7 Oct 2026</td><td>18:15</td><td class="event">Calendar event ${i}</td></tr>`).join('');
 await page.setViewportSize({width:800,height:480});
 await page.setContent(`<style>body{margin:0}.screen{height:100vh}.layout{height:calc(100vh - 40px)}.title_bar{height:40px}${css}</style><div class="screen"><div class="layout"><div class="next-ten"><h1>Coming Up</h1><table><colgroup><col style="width:145px"><col style="width:65px"><col></colgroup>${rows}</table><p class="more-events" hidden></p></div></div><div class="title_bar">Footer</div></div><script>${script}</script>`);
 await page.waitForTimeout(100);
 const read=()=>page.evaluate(()=>({visible:document.querySelectorAll('.event-row:not([hidden])').length,text:document.querySelector('.more-events').textContent,noticeHidden:document.querySelector('.more-events').hidden,bottom:document.querySelector('.more-events').getBoundingClientRect().bottom,footer:document.querySelector('.title_bar').getBoundingClientRect().top}));
 const og=await read();assert(og.visible<15 && og.visible>0);assert.equal(og.text,`+ ${15-og.visible} more events`);assert(og.bottom<=og.footer);console.log('OG:',og);
 await page.setViewportSize({width:1200,height:900});await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.waitForTimeout(100);const large=await read();assert.equal(large.visible,15);assert(large.noticeHidden);console.log('Large screen: all 15 events visible; notice hidden.');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
