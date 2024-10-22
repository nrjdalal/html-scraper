import * as AWS from "@aws-sdk/client-lambda"
import express from "express"
import { gotScraping } from "got-scraping"
import serverless from "serverless-http"

const app = express()

app.use((req, res, next): any => {
  if (process.env.TYPE === "dev") return next()

  if (!req.query.key || req.query.key !== process.env.API_KEY) {
    return res.status(401).send("Unauthorized!")
  }

  return next()
})

app.get("/switch", async (req, res): Promise<any> => {
  if (process.env.TYPE === "dev") return res.send("Not available in dev mode!")

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

  res.json({
    ...(data as object),
    time: (performance.now() - start).toFixed(0),
  })
})

app.get("/", async (req, res): Promise<any> => {
  const start = performance.now()

  try {
    const { search } = req.query as { search?: string }

    if (!search) {
      return res.status(400).send("Please provide a search query!")
    }

    const searchUrl = search.startsWith("http")
      ? search
      : `https://google.com/search?q=${search}`

    const response = await gotScraping({
      url: searchUrl,
      headerGeneratorOptions: {
        browser: "chrome",
        devices: ["desktop"],
        operatingSystems: ["windows"],
      },
    })

    if (!response.statusCode.toString().startsWith("2")) {
      return res.status(response.statusCode).json({
        statusCode: response.statusCode,
        body: response.body,
      })
    }

    return response.headers["content-type"]?.includes("application/json")
      ? res.json(
          JSON.parse(
            JSON.stringify({
              ...JSON.parse(response.body),
              scrapeTime: `${(performance.now() - start).toFixed(2)}ms`,
            }),
          ),
        )
      : res.send(
          response.body.replace(
            /(<body[^>]*>)/i,
            `$1<p style="z-index: 9999; position: absolute; bottom: 16px; left: 16px; color: black; background-color: white; padding: 4px;">Scrape Time: ${(performance.now() - start).toFixed(2)}ms</p>`,
          ),
        )
  } catch (error) {
    console.error(error)
    res.status(500).send("An error occurred!")
  }
})

if (process.env.TYPE === "dev") {
  const PORT = 5555
  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`),
  )
}

export const handler = serverless(app)
