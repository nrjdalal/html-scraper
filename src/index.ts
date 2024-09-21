import express from "express"
import serverless from "serverless-http"

const app = express()

app.get("/", async (req, res) => {
  const start = performance.now()

  try {
    const { search, key } = req.query

    if (!key || key !== process.env.API_KEY) {
      return res.status(401).send("Unauthorized!")
    }

    if (!search) {
      return res.status(400).send("Please provide a search query!")
    }

    const searchUrl = search.startsWith("http")
      ? search
      : `https://google.com/search?q=${search}`

    const html = await fetch(searchUrl).then((res) => res.text())

    return res
      .status(200)
      .send(
        html + `\n\nTime taken: ${(performance.now() - start).toFixed(2)}ms`,
      )
  } catch (error) {
    console.error(error)
    res.status(500).send("An error occurred!")
  }
})

if (process.env.TYPE === "dev") {
  const PORT = process.env.PORT || 5555
  app.listen(PORT, console.log("App listening on port", PORT || 5555))
}

export const handler = serverless(app)
