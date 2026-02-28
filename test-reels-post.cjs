const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, 'playwright-screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });

  // Capture console messages
  const consoleLogs = [];
  const networkErrors = [];

  const page = await context.newPage();

  page.on('console', msg => {
    const entry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(entry);
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    const entry = `[PAGE ERROR] ${err.message}`;
    consoleLogs.push(entry);
    console.log('PAGE ERROR:', err.message);
  });

  page.on('requestfailed', req => {
    const entry = `[NETWORK FAIL] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`;
    networkErrors.push(entry);
    console.log('NETWORK FAIL:', req.method(), req.url());
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      const entry = `[HTTP ${response.status()}] ${response.url()}`;
      networkErrors.push(entry);
      console.log(`HTTP ${response.status()}:`, response.url());
    }
  });

  console.log('\n=== STEP 1: Navigate to http://localhost:5000 ===');
  await page.goto('http://localhost:5000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('Current URL after navigation:', page.url());
  await page.screenshot({ path: path.join(screenshotDir, '01-initial-navigation.png'), fullPage: true });
  console.log('Screenshot saved: 01-initial-navigation.png');
  console.log('Page title:', await page.title());

  // Check if we're on login page
  const currentUrl = page.url();
  console.log('\n=== STEP 2: Check login state ===');
  console.log('URL:', currentUrl);

  if (currentUrl.includes('login') || currentUrl.includes('auth') || currentUrl.includes('signin')) {
    console.log('Login page detected. Attempting to log in...');

    // Look for email and password fields
    const emailField = await page.$('input[type="email"], input[name="email"]');
    const passwordField = await page.$('input[type="password"], input[name="password"]');

    if (emailField && passwordField) {
      console.log('Found login form fields');
      await emailField.fill('diorgeone@gmail.com');
      await passwordField.fill('admin123');

      await page.screenshot({ path: path.join(screenshotDir, '02-login-form-filled.png'), fullPage: true });
      console.log('Screenshot saved: 02-login-form-filled.png');

      // Submit form
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('Clicked submit button');
        await page.waitForTimeout(3000);
        try {
          await page.waitForLoadState('networkidle', { timeout: 15000 });
        } catch(e) {}
        console.log('URL after login attempt:', page.url());
        await page.screenshot({ path: path.join(screenshotDir, '03-after-login-attempt.png'), fullPage: true });
        console.log('Screenshot saved: 03-after-login-attempt.png');

        // Check for error messages
        const errorMsg = await page.evaluate(() => {
          const el = document.querySelector('[role="alert"], .error, [class*="error"], [class*="toast"]');
          return el ? el.textContent?.trim() : null;
        });
        if (errorMsg) {
          console.log('Error/toast message found:', errorMsg);
        }
      }
    } else {
      console.log('Could not find login form fields');
      const pageContent = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('Page content snippet:', pageContent);
    }
  } else {
    console.log('Already authenticated or no redirect to login');
  }

  console.log('\n=== STEP 3: Navigate to Schedule ===');
  console.log('Current URL:', page.url());

  // Navigate to schedule page
  await page.goto('http://localhost:5000/dashboard/schedule', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('Schedule URL:', page.url());
  await page.screenshot({ path: path.join(screenshotDir, '04-schedule-page.png'), fullPage: true });
  console.log('Screenshot saved: 04-schedule-page.png');

  const schedulePageTitle = await page.title();
  console.log('Schedule page title:', schedulePageTitle);
  const scheduleContent = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('Schedule page content preview:', scheduleContent);

  console.log('\n=== STEP 4: Analyze calendar structure and find + button ===');

  // Get all buttons
  const allButtons = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, [role="button"]');
    return Array.from(buttons).map((b, i) => ({
      index: i,
      text: b.textContent?.trim().substring(0, 60),
      ariaLabel: b.getAttribute('aria-label'),
      title: b.getAttribute('title'),
      className: b.className?.toString().substring(0, 100),
      visible: window.getComputedStyle(b).display !== 'none' && b.offsetParent !== null
    }));
  });

  console.log('\nAll visible buttons on schedule page:');
  allButtons.filter(b => b.visible).forEach(b =>
    console.log(`  [${b.index}] text="${b.text}" aria="${b.ariaLabel}" class="${b.className}"`)
  );

  // Look for calendar day cells - try various approaches
  const calendarInfo = await page.evaluate(() => {
    // Look for calendar grid
    const possibleCalendars = [
      document.querySelector('.fc'),
      document.querySelector('[class*="calendar"]'),
      document.querySelector('[class*="Calendar"]'),
      document.querySelector('[data-testid*="calendar"]'),
      document.querySelector('table'),
    ].filter(Boolean);

    return possibleCalendars.map(el => ({
      tag: el.tagName,
      className: el.className?.toString().substring(0, 100),
      childCount: el.children.length,
      innerHTML: el.innerHTML.substring(0, 200)
    }));
  });
  console.log('\nCalendar elements found:', JSON.stringify(calendarInfo, null, 2));

  // Try hovering over calendar days to reveal + buttons
  console.log('\nLooking for day cells...');
  const dayCellSelectors = [
    '.fc-daygrid-day',
    '[class*="day-cell"]',
    '[class*="DayCell"]',
    '[class*="calendar-day"]',
    'td[data-date]',
    '[role="gridcell"]',
    '[class*="CalendarDay"]',
    'td[class*="day"]'
  ];

  let dayCells = [];
  for (const sel of dayCellSelectors) {
    const cells = await page.$$(sel);
    if (cells.length > 0) {
      console.log(`Found ${cells.length} day cells with selector: ${sel}`);
      dayCells = cells;
      break;
    }
  }

  if (dayCells.length > 0) {
    // Hover first few cells
    for (let i = 0; i < Math.min(3, dayCells.length); i++) {
      await dayCells[i].hover();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(screenshotDir, '05-after-hover-day-cells.png'), fullPage: true });
    console.log('Screenshot saved: 05-after-hover-day-cells.png');

    // Check for + buttons appearing after hover
    const plusButtons = await page.evaluate(() => {
      const allBtns = document.querySelectorAll('button, [role="button"]');
      return Array.from(allBtns).filter(b => {
        const text = b.textContent?.trim();
        const html = b.innerHTML;
        return text === '+' || html.includes('PlusCircle') || html.includes('plus') ||
               b.getAttribute('aria-label')?.includes('add') ||
               b.getAttribute('aria-label')?.includes('+') ||
               b.getAttribute('data-testid')?.includes('plus');
      }).map(b => ({
        text: b.textContent?.trim().substring(0, 30),
        html: b.innerHTML.substring(0, 100),
        ariaLabel: b.getAttribute('aria-label'),
        visible: b.offsetParent !== null,
        rect: JSON.stringify(b.getBoundingClientRect())
      }));
    });
    console.log('+ buttons after hover:', JSON.stringify(plusButtons, null, 2));

    // Try clicking first cell
    console.log('\nTrying to click on first day cell...');
    await dayCells[5].click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, '06-after-day-click.png'), fullPage: true });
    console.log('Screenshot saved: 06-after-day-click.png');

    // Check if modal/dialog opened
    const modal = await page.$('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="Dialog"]');
    if (modal) {
      console.log('Modal/Dialog opened!');
      const modalContent = await modal.evaluate(el => el.innerHTML.substring(0, 500));
      console.log('Modal content:', modalContent);
    } else {
      console.log('No modal/dialog found after click');
    }
  } else {
    console.log('No day cells found. Taking screenshot of full page.');
    await page.screenshot({ path: path.join(screenshotDir, '05-no-day-cells.png'), fullPage: true });
  }

  // Try hover approach - hover over plus icons in the calendar
  console.log('\n=== STEP 5: Try to find + button with hover ===');

  // Get all elements and hover them to see if + buttons appear
  const allClickable = await page.$$('button, a, [role="button"]');
  console.log(`Total clickable elements: ${allClickable.length}`);

  // Try clicking a visible + or add button
  try {
    await page.click('[aria-label*="Adicionar"], [aria-label*="adicionar"], [aria-label*="Add"], [aria-label*="add"], [aria-label*="Criar"], [aria-label*="criar"], [aria-label*="New post"], [aria-label*="novo post"]', { timeout: 2000 });
    console.log('Clicked add button by aria-label');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotDir, '07-after-add-click.png'), fullPage: true });
  } catch(e) {
    console.log('No add button found by aria-label');
  }

  // Final screenshot
  await page.screenshot({ path: path.join(screenshotDir, '08-final-state.png'), fullPage: true });
  console.log('Screenshot saved: 08-final-state.png');

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Final URL:', page.url());
  console.log('\nAll Console Logs:');
  consoleLogs.forEach(l => console.log(' ', l));
  console.log('\nNetwork Errors:');
  networkErrors.forEach(e => console.log(' ', e));
  console.log('\nScreenshots saved to:', screenshotDir);

  await browser.close();
  console.log('\nTest completed.');
})().catch(err => {
  console.error('Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
