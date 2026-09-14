import { createServer } from "node:http"
import { parse as parseUrl } from "node:url"
import next from "next"

function getArgValue(longFlag, shortFlag) {
  const args = process.argv.slice(2)

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index]

    if (current === longFlag || current === shortFlag) {
      return args[index + 1]
    }

    if (current.startsWith(`${longFlag}=`)) {
      return current.slice(longFlag.length + 1)
    }

    if (current.startsWith(`${shortFlag}=`)) {
      return current.slice(shortFlag.length + 1)
    }
  }

  return undefined
}

const port = Number.parseInt(
  getArgValue("--port", "-p") || process.env.PORT || "3000",
  10
)
const hostname = getArgValue("--hostname", "-H") || process.env.HOST || "localhost"
const app = next({
  dev: true,
  hostname,
  port,
  webpack: true,
})
const handle = app.getRequestHandler()

app
  .prepare()
  .then(() => {
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parseUrl(req.url || "/", true)
        await handle(req, res, parsedUrl)
      } catch (error) {
        console.error("Failed to handle request", error)
        res.statusCode = 500
        res.end("Internal Server Error")
      }
    })

    server.on("error", (error) => {
      console.error("Development server failed to start", error)
      process.exit(1)
    })

    server.listen(port, hostname, () => {
      console.log(`Dev server ready on http://${hostname}:${port}`)
    })
  })
  .catch((error) => {
    console.error("Failed to prepare Next.js dev server", error)
    process.exit(1)
  })
