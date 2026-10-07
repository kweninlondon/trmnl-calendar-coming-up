const { chromium }=require('playwright');
const fs=require('fs'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH} : {})});const page=await browser.newPage();
 const source=fs.readFileSync(process.env.LAYOUT_FILE || 'layouts/full.html','utf8');
 const shared=fs.readFileSync('layouts/shared.html','utf8');
 const css=shared.match(/<style>([\s\S]*?)<\/style>/)[1]+source.match(/<style>([\s\S]*?)<\/style>/)[1];
 const script=shared.match(/<script>([\s\S]*?)<\/script>/)[1];
 const framework=require('./framework.cjs')();
 const rootClass=source.match(/class="(next-ten[^"]*)"/)[1], headingClass=source.match(/<h1 class="([^"]*)"/)[1], sectionClass=source.match(/<th class="([^"]*)"/)[1], eventClass=source.match(/class="(event [^"]*)"/)[1];
 const rows=Array.from({length:15},(_,i)=>(i===0||i===5?`<tr class="section"><th class="${sectionClass}" colspan="3">Group</th></tr>`:'')+(i===5?'<tr class="group-gap"><td class="py--0.5 px--0" colspan="3"></td></tr>':'')+`<tr class="event-row"><td class="date py--0.5 px--0">Wed 7 Oct 2026</td><td class="time py--0.5 px--0">18:15</td><td class="${eventClass}">${process.env.LAYOUT_FILE ? `<span class="event-name">This is a very long event name that spans several lines and must be truncated without hiding its calendar ${i}</span><span class="calendar-label">Lily’s Calendar</span>` : `Calendar event ${i}`}</td></tr>`).join('');
 await page.setViewportSize({width:process.env.LAYOUT_FILE ? 400 : 800,height:process.env.LAYOUT_FILE === 'layouts/quadrant.html' ? 240 : 480});
 await page.setContent(`<body class="trmnl"><style>${framework}body{margin:0}.trmnl .screen{height:100vh;width:100vw}.layout{height:calc(100vh - 40px)}.title_bar{height:40px}${css}</style><div class="screen"><div class="layout"><div class="${rootClass}"><h1 class="${headingClass}" data-count-template="Coming Up: {count}">Coming Up: 15</h1><table><colgroup><col style="width:${process.env.LAYOUT_FILE ? 90 : 145}px"><col style="width:${process.env.LAYOUT_FILE ? 45 : 65}px"><col></colgroup>${rows}</table></div></div><div class="title_bar"><span class="title" data-count-template="{count} events coming up">15 events coming up</span></div></div><script>${script}</script>`);
 await page.waitForTimeout(100);
 const read=()=>page.evaluate(()=>({visible:document.querySelectorAll('.event-row:not([hidden])').length,text:document.querySelector('.title_bar .title').textContent,title:document.querySelector('h1').textContent,bottom:document.querySelector('table').getBoundingClientRect().bottom,footer:document.querySelector('.title_bar').getBoundingClientRect().top,extraLine:!!document.querySelector('.event-count')}));
 const og=await read();assert(og.visible<15 && og.visible>0);assert.equal(og.text,`${og.visible} events coming up`);assert.equal(og.title,`Coming Up: ${og.visible}`);assert(!og.extraLine);assert(og.bottom<=og.footer);console.log('OG:',og);
 if(process.env.LAYOUT_FILE){const metrics=await page.evaluate(()=>{const name=document.querySelector('.event-row:not([hidden]) .event-name'),label=document.querySelector('.event-row:not([hidden]) .calendar-label');return {nameHeight:name.getBoundingClientRect().height,overflows:name.scrollHeight>name.clientHeight,label:label.textContent,labelHeight:label.getBoundingClientRect().height};});assert(metrics.nameHeight<=34);assert(metrics.overflows);assert.equal(metrics.label,'Lily’s Calendar');assert(metrics.labelHeight>0);console.log('Two-line title clamp and separate calendar label verified.');}
 await page.setViewportSize({width:1200,height:1200});await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.waitForTimeout(100);const large=await read();assert.equal(large.visible,15);assert.equal(large.text,'15 events coming up');console.log('Large screen: all 15 events visible; footer count is 15.');
 await page.evaluate(()=>{document.querySelector('.title_bar .title').setAttribute('data-count-template','My 15 favourite dates');window.dispatchEvent(new Event('resize'));});
 assert.equal((await read()).text,'15 events coming up'); // No placeholder means layout does not rewrite user text.
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
