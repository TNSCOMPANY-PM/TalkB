// TalkB ad-creatives capture script
// node capture.js              — 전체 캡처
// node capture.js ad-a og-image — 지정 파일만 캡처
const puppeteer = require('puppeteer');
const path = require('path');

const ALL_FILES = [
  { name: 'ad-a',          width: 1080, height: 1080 },
  { name: 'ad-b',          width: 1080, height: 1080 },
  { name: 'ad-c',          width: 1080, height: 1080 },
  { name: 'og-image',      width: 1200, height:  630 },
  { name: 'profile-image', width: 1080, height: 1080 },
];

const dir = __dirname;
const args = process.argv.slice(2);
const targets = args.length
  ? ALL_FILES.filter(f => args.includes(f.name))
  : ALL_FILES;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
  });

  for (const { name, width, height } of targets) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 }); // 2× Retina

    const filePath = 'file:///' + path.join(dir, name + '.html').replace(/\\/g, '/');
    await page.goto(filePath, { waitUntil: 'networkidle0' });

    // 웹폰트 완전 로드 대기
    await page.evaluate(() => document.fonts.ready);
    // 추가 렌더링 여유 (애니메이션 등 안정화)
    await new Promise(r => setTimeout(r, 400));

    const outPath = path.join(dir, name + '.png');
    await page.screenshot({
      path: outPath,
      clip: { x: 0, y: 0, width, height },
    });

    console.log('✓ ' + name + '.png (' + width + '×' + height + ') 저장 완료');
    await page.close();
  }

  await browser.close();
  console.log('\n' + targets.length + '종 캡처 완료.');
})();
