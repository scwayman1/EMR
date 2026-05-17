# Click-handler findings — 2026-05-17

Pass 8: walked 1 public routes, found
**31** interactive elements, attempted
**6** clicks (0 skipped by safety filter).
Captured by `e2e/click-handlers.spec.ts`.

**16 findings** — 0 high, 16 medium, 0 low.

| Kind | Count |
|---|---|
| console_error_on_click | 14 |
| click_threw | 2 |

## By URL

### `/status` (16)
- **MED** console_error_on_click — `Subscribe` (`div > main > div > div:nth-of-type(5) > div:nth-of-type(2) > form > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Subscribe` (`div > main > div > div:nth-of-type(5) > div:nth-of-type(2) > form > button`) — Warning: Text content did not match. Server: "%s" Client: "%s"%s 11:22:34 AM 11:22:37 AM 
    at p
    at div
    at div
    at div
    at StatusView (webpack-internal:///(app-pages-browser)/./src/app/status/status-view.tsx:114:90)
    at main
    at div
    at StatusPage (Server)
    at InnerLayout
- **MED** console_error_on_click — `Subscribe` (`div > main > div > div:nth-of-type(5) > div:nth-of-type(2) > form > button`) — Warning: An error occurred during hydration. The server HTML was replaced with client content in <%s>. #document
- **MED** console_error_on_click — `Subscribe` (`div > main > div > div:nth-of-type(5) > div:nth-of-type(2) > form > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** click_threw — `Product+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button`) — locator.click: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button').first()[22m
[2m    - locator resolved to
- **MED** console_error_on_click — `Product+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Product+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button`) — Warning: Text content did not match. Server: "%s" Client: "%s"%s 11:22:47 AM 11:22:50 AM 
    at p
    at div
    at div
    at div
    at StatusView (webpack-internal:///(app-pages-browser)/./src/app/status/status-view.tsx:114:90)
    at main
    at div
    at StatusPage (Server)
    at InnerLayout
- **MED** console_error_on_click — `Product+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button`) — Warning: An error occurred during hydration. The server HTML was replaced with client content in <%s>. #document
- **MED** console_error_on_click — `Product+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Product+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(1) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** click_threw — `Company+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button`) — locator.click: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button').first()[22m
[2m    - locator resolved to
- **MED** console_error_on_click — `Company+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Company+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button`) — Warning: Text content did not match. Server: "%s" Client: "%s"%s 11:22:57 AM 11:22:59 AM 
    at p
    at div
    at div
    at div
    at StatusView (webpack-internal:///(app-pages-browser)/./src/app/status/status-view.tsx:114:90)
    at main
    at div
    at StatusPage (Server)
    at InnerLayout
- **MED** console_error_on_click — `Company+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button`) — Warning: An error occurred during hydration. The server HTML was replaced with client content in <%s>. #document
- **MED** console_error_on_click — `Company+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
- **MED** console_error_on_click — `Company+` (`body > div > footer > div > div:nth-of-type(2) > div:nth-of-type(2) > button`) — Warning: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.%s https://www.theleafmart
