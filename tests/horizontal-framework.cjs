const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
try {
const page=await browser.newPage();await page.setViewportSize({width:800,height:480});
const source=fs.readFileSync('layouts/half_horizontal.html','utf8'),framework=fs.readFileSync(process.env.FRAMEWORK_CSS,'utf8'),asset=fs.readFileSync('assets/coming-up.css','utf8'),shared=fs.readFileSync('layouts/shared.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const layoutClass=source.match(/class="(layout[^"]*)"/)[1],rootClass=source.match(/class="(next-ten[^"]*)"/)[1],headingClass=source.match(/<h1 class="([^"]*)"/)[1],eventClass=source.match(/class="(event [^"]*)"/)[1];
const groups=['Today','This week','This week','This week','Next week','Next week','Next week','Later','Later','Later','Later','Later','Later','Later','Later'];
const titles=['🍕 Pizza night','📚 Book club','🎨 Art club','☕ Coffee with neighbours','🎬 Cinema with friends','🧘 Evening yoga','🌳 Woodland walk','🛍️ Autumn craft fair','🌱 Community garden morning','🎃 Pumpkin picking','🦁 A day at the zoo','🎵 Live music night','🎄 Christmas market','✨ New year planning','🎂 Birthday party'];
const rows=groups.map((group,i)=>`<tr class="event-row" data-group="${group}" data-index="${i}"><td class="date py--0.5 px--0">Wed, 7 Oct</td><td class="time py--0.5 px--0">18:30</td><td class="${eventClass}"><span class="event-name">${titles[i]}</span><span class="calendar-label">${i%2?'Community Events':'Family Events'}</span></td></tr>`);
const table=rows=>`<div class="${rootClass}"><table><colgroup><col class="agenda-date-col"><col class="agenda-time-col"><col></colgroup>${rows.join('')}</table></div>`;
await page.setContent(`<body class="trmnl"><style>${framework}${asset}</style><div class="screen screen--sm screen--1bit"><div class="view view--half_horizontal"><div class="${layoutClass}" data-grouping="true"><h1 class="${headingClass}">Coming Up</h1><div class="calendar-columns">${table(rows.slice(0,8))}${table(rows.slice(8))}</div></div><div class="title_bar"><span class="title" data-count-template="{count} events coming up">15 events coming up</span></div></div></div><script>${shared}</script>`,{waitUntil:'load'});
await page.waitForTimeout(100);
const result=await page.evaluate(()=>({count:document.querySelectorAll('.event-row').length,indices:Array.from(document.querySelectorAll('.event-row'),r=>+r.dataset.index),labels:document.querySelectorAll('.calendar-label').length,footer:document.querySelector('.title_bar').getBoundingClientRect().top,bottoms:Array.from(document.querySelectorAll('table'),t=>t.getBoundingClientRect().bottom),layout:document.querySelector('.layout').getBoundingClientRect().height}));
const continuation=await page.locator('.section-continuation th').textContent();assert.equal(continuation,'This week (Cont.)');
const appearance=await page.locator('.section-continuation th').evaluate(e=>({background:getComputedStyle(e).backgroundColor,ink:getComputedStyle(e).color,top:getComputedStyle(e).borderTopWidth,bottom:getComputedStyle(e).borderBottomWidth,weight:getComputedStyle(e).fontWeight}));assert.equal(appearance.background,'rgb(255, 255, 255)');assert.equal(appearance.ink,'rgb(0, 0, 0)');assert.equal(appearance.top,'1px');assert.equal(appearance.bottom,'1px');assert.equal(appearance.weight,'400');
console.log('Actual Framework OG half-horizontal:',result,'Continuation heading verified.');
assert.deepEqual(result.indices,Array.from({length:result.count},(_,i)=>i));assert(result.bottoms.every(n=>n<=result.footer));assert.equal(result.labels,result.count);
assert(result.count>=6, 'OG half-horizontal should fit at least six of the grouped demo events');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
