import * as AWS from "@aws-sdk/client-lambda"
import { Hono } from "hono"
import { handle } from "hono/aws-lambda"

// import { gotScraping } from "got-scraping"

const app = new Hono()

app.use(async (c, next) => {
  if (process.env.TYPE === "dev") return await next()

  if (!c.req.query("key") || c.req.query("key") !== process.env.API_KEY) {
    return c.text("Unauthorized!", 401)
  }

  return await next()
})

app.get("/switch", async (c) => {
  if (process.env.TYPE === "dev") return c.text("Not available in dev mode!")

  const start = performance.now()

  const lambdaClient = new AWS.LambdaClient({
    region: process.env.FUNCTION_REGION!,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    },
  })

  const existingConfig = await lambdaClient.send(
    new AWS.GetFunctionConfigurationCommand({
      FunctionName: process.env.FUNCTION_NAME!,
    }),
  )

  await lambdaClient.send(
    new AWS.UpdateFunctionConfigurationCommand({
      FunctionName: process.env.FUNCTION_NAME!,
      Environment: {
        Variables: {
          RUN: `${Math.random()}`,
          ...(existingConfig.Environment?.Variables ?? {}),
        },
      },
    }),
  )

  await new Promise((resolve) => setTimeout(resolve, 5000))

  const response = await fetch("https://api.apify.com/v2/browser-info")
  const data = await response.json()

  return c.json({
    ...(data as object),
    time: (performance.now() - start).toFixed(0),
  })
})

app.get("/", async (c) => {
  const start = performance.now()

  try {
    const { search } = c.req.query() as { search?: string }

    if (!search) {
      return c.text("Please provide a search query!", 400)
    }

    const searchUrl = search.startsWith("http")
      ? search
      : `https://google.com/search?q=${search}`

    // const response = await gotScraping({
    //   url: searchUrl,
    //   headerGeneratorOptions: {
    //     browser: "chrome",
    //     devices: ["desktop"],
    //     operatingSystems: ["windows"],
    //   },
    // })

    let response = (await fetch(searchUrl)) as any

    response = {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    }

    if (!response.statusCode.toString().startsWith("2")) {
      return c.json({
        statusCode: response.statusCode,
        body: response.body,
      })
    }

    return response.headers["content-type"]?.includes("application/json")
      ? c.json(
          JSON.parse(
            JSON.stringify({
              ...JSON.parse(response.body),
              scrapeTime: `${(performance.now() - start).toFixed(2)}ms`,
            }),
          ),
        )
      : c.html(
          response.body.replace(
            /(<body[^>]*>)/i,
            `$1<p style="z-index: 9999; position: absolute; bottom: 16px; left: 16px; color: black; background-color: white; padding: 4px;">Scrape Time: ${(performance.now() - start).toFixed(2)}ms</p>`,
          ),
        )
  } catch (error) {
    console.error(error)
    c.text("An error occurred!", 500)
  }
})

export default app

// for aws-lambda
export const handler = handle(app)
