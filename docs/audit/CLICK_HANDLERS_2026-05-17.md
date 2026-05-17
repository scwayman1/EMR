# Click-handler findings — 2026-05-17

Pass 8: walked 1 public routes, found
**31** interactive elements, attempted
**25** clicks (1 skipped by safety filter).
Captured by `e2e/click-handlers.spec.ts`.

**31 findings** — 0 high, 31 medium, 0 low.

| Kind | Count |
|---|---|
| console_error_on_click | 24 |
| click_threw | 5 |
| failed_request_on_click | 2 |

## By URL

### `/status` (31)
- **MED** console_error_on_click — `Subscribe` (`div > main > div > div:nth-of-type(5) > div:nth-of-type(2) > form > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Join` (`div > footer > div > div:nth-of-type(1) > div:nth-of-type(2) > form > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** click_threw — `Product+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button`) — locator.click: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button').first()[22m
[2m    - locator resolved to
- **MED** console_error_on_click — `Product+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Product+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** click_threw — `Company+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button`) — locator.click: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button').first()[22m
[2m    - locator resolved to
- **MED** console_error_on_click — `Company+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Company+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** click_threw — `Resources+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(3) > button`) — locator.click: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(3) > button').first()[22m
[2m    - locator resolved to
- **MED** console_error_on_click — `Resources+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(3) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Resources+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(3) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** click_threw — `Legal+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(4) > button`) — locator.click: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(4) > button').first()[22m
[2m    - locator resolved to
- **MED** console_error_on_click — `Legal+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(4) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Legal+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(4) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `↑ Back to top` (`body > div > footer > div > div:nth-of-type(3) > div:nth-of-type(1) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Send feedback` (`body > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** click_threw — `Skip to content` (`body > a`) — locator.click: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('body > a').first()[22m
[2m    - locator resolved to <a href="#main-content" class="sr-only focus:not-sr-only focus:fixe
- **MED** console_error_on_click — `Skip to content` (`body > a`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Leafjourney home` (`body > div > header > div > a:nth-of-type(1)`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Security` (`body > div > header > div > nav > a:nth-of-type(2)`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Education` (`body > div > header > div > nav > a:nth-of-type(3)`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** failed_request_on_click — `Education` (`body > div > header > div > nav > a:nth-of-type(3)`) — POST http://localhost:3000/education → network failure
- **MED** failed_request_on_click — `Education` (`body > div > header > div > nav > a:nth-of-type(3)`) — GET http://localhost:3000/education?_rsc=1vpix → network failure
- **MED** console_error_on_click — `LeafMart` (`body > div > header > div > nav > a:nth-of-type(4)`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Marketplace` (`body > div > header > div > nav > a:nth-of-type(5)`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Developer` (`body > div > header > div > nav > a:nth-of-type(6)`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `The LeafMart` (`footer > div > div:nth-of-type(2) > div:nth-of-type(1) > ul > li:nth-of-type(4) > a`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `About` (`footer > div > div:nth-of-type(2) > div:nth-of-type(2) > ul > li:nth-of-type(1) > a`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Security` (`footer > div > div:nth-of-type(2) > div:nth-of-type(2) > ul > li:nth-of-type(2) > a`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Careers` (`footer > div > div:nth-of-type(2) > div:nth-of-type(2) > ul > li:nth-of-type(3) > a`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Education` (`footer > div > div:nth-of-type(2) > div:nth-of-type(3) > ul > li:nth-of-type(1) > a`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
