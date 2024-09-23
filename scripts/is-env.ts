import { customAlphabet } from "nanoid"

const envfile = (".env." + Bun.argv[2]) as any

const file = Bun.file(envfile)

if (envfile === ".env.dev") {
  if (await file.exists()) {
    console.log("\nDevelopment environment file detected.\n")
  }

  if (!(await file.exists())) {
    Bun.write(
      envfile,
      `API_KEY=${customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 24)()}\n`,
    )

    console.log("\nDevelopment environment file created.\n")
  }
}

export {}
