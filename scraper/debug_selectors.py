"""
Debug skripta v2 — koristi ispravan URL /poslovi
"""

import asyncio
from playwright.async_api import async_playwright

async def debug():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        print("Učitavam https://www.mojposao.hr/poslovi ...")
        await page.goto("https://www.mojposao.hr/poslovi", timeout=30000)

        print("Čekam da se Vue hydrira...")
        try:
            await page.wait_for_selector("a[href*='oglas'], a[href*='posao'], article, [class*='job'], [class*='offer'], [class*='card'], li[class*='item']", timeout=15000)
            print("✓ Element pronađen!")
        except:
            print("⚠ Timeout — nastavljam")

        await page.wait_for_timeout(4000)

        # Svi linkovi
        links = await page.evaluate("""() => {
            const all = document.querySelectorAll('a[href]');
            return Array.from(all)
                .map(a => ({ href: a.href, text: a.innerText.trim().substring(0, 80), cls: a.className.substring(0,80) }))
                .filter(a => a.text.length > 3)
                .slice(0, 30);
        }""")

        print(f"\n=== LINKOVI ({len(links)}) ===")
        for l in links:
            print(f"  {l['href']}")
            print(f"  tekst: {l['text']}")
            print(f"  klasa: {l['cls']}")
            print()

        # Klase s ključnim riječima
        all_classes = await page.evaluate("""() => {
            const els = document.querySelectorAll('*[class]');
            const cls = new Set();
            els.forEach(e => {
                e.className.toString().split(' ').forEach(c => {
                    if (c.length > 2) cls.add(e.tagName.toLowerCase() + '.' + c);
                });
            });
            return Array.from(cls).sort();
        }""")

        keywords = ['job','offer','listing','card','item','oglas','posao','result','search','salary','plac','wage','company','employer','position','title','ad','vacancy']
        print("=== RELEVANTNE KLASE ===")
        for cls in all_classes:
            if any(k in cls.lower() for k in keywords):
                print(f"  {cls}")

        # HTML
        html = await page.evaluate("document.body.innerHTML.substring(0, 10000)")
        print("\n=== HTML (prvih 10000 znakova) ===")
        print(html)

        await browser.close()

asyncio.run(debug())