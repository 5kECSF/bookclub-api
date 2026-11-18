  
# setting up the project
  
## authentication code
  
## validation code

- "phoneOrEmail": "<a@b.co>",
- "code": random 6 digits (emailed, or logged to the console when `EMAIL_PROVIDER=console` / no `GMAIL_APP_PWD`)
- set `VERIFICATION_CODE=000000` (dev/test/e2e only, ignored in production) to use a fixed code
