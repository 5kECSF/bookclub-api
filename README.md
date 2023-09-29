for generating new resource
`bash
`
nest g resource users

steps to use this project

1. pnpm install to install dependencies
2. create a .env.dev /.env.test files for storing env variables and fill the default values based on the .env file
3.

## for running e2e tests

### to run all the test run

> pnpm test:e2e

### to run individual tests run `pnpm test:<name>`

example

> pnpm test:login
>
> pnpm test:signup
>
> pnpm test:tag

## to see the compodoc  run

```bash
pnpm doc:serve
# and visit 
http://127.0.0.1:8080
```