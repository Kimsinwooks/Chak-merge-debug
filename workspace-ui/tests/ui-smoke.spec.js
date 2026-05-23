import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173'

test('UI smoke: page loads and no fatal console errors', async ({ page }) => {
  const errors = []
  const failedRequests = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} ${req.failure()?.errorText}`)
  })

  page.on('response', async (res) => {
    const url = res.url()
    const status = res.status()
    if (
      status >= 400 &&
      (
        url.includes('/api/') ||
        url.includes('/rooms') ||
        url.includes('/meeting') ||
        url.includes('/todo-calendar') ||
        url.includes('/calendar') ||
        url.includes('/chat')
      )
    ) {
      failedRequests.push(`${status} ${url}`)
    }
  })

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'test-results/home.png', fullPage: true })

  // fatal ReferenceError류만 즉시 실패 처리
  const fatal = errors.filter((e) =>
    /ReferenceError|is not defined|Cannot read properties|Uncaught/i.test(e)
  )

  expect(fatal, fatal.join('\n')).toHaveLength(0)

  // 404/500 API 확인용 출력
  console.log('FAILED_REQUESTS')
  console.log(failedRequests.join('\n'))
})

test('UI smoke: click visible buttons without JS crash', async ({ page }) => {
  const errors = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto(BASE, { waitUntil: 'networkidle' })

  const buttons = await page.locator('button:visible').all()
  console.log('visible button count:', buttons.length)

  const max = Math.min(buttons.length, 40)

  for (let i = 0; i < max; i++) {
    const btn = buttons[i]
    const text = (await btn.innerText().catch(() => '')).trim()
    const disabled = await btn.isDisabled().catch(() => true)

    console.log(`[BUTTON ${i}] disabled=${disabled} text=${text}`)

    if (disabled) continue

    // 위험 버튼은 자동 클릭 제외
    if (/삭제|회의 종료|로그아웃|탈퇴|Delete|Remove/i.test(text)) continue

    await btn.click({ timeout: 2000 }).catch((e) => {
      console.log(`[CLICK_FAIL] ${i} ${text} ${e.message}`)
    })

    await page.waitForTimeout(300)
  }

  const fatal = errors.filter((e) =>
    /ReferenceError|is not defined|Cannot read properties|Uncaught/i.test(e)
  )

  expect(fatal, fatal.join('\n')).toHaveLength(0)
})
