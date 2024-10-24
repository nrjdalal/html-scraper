/// <reference path="./.sst/platform/config.d.ts" />

import pulumi from "@pulumi/pulumi"
import z from "zod"

export default $config({
  app(input) {
    return {
      name: "html-scraper",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    }
  },

  async run() {
    const schema = z
      .object({
        API_KEY: z.string().min(8),
        SST_AWS_ACCESS_KEY_ID: z.string(),
        SST_AWS_SECRET_ACCESS_KEY: z.string(),
        PULUMI_NODEJS_PROJECT: z.string(),
        PULUMI_NODEJS_STACK: z.enum(["dev"]),
      })
      .parse(process.env)

    const apSouth1 = new sst.aws.Function(
      "html-scraper",
      {
        handler: "dist/index.handler",
        memory: "256 MB",
        runtime: "nodejs20.x",
        url: true,
        environment: {
          API_KEY: schema.API_KEY,
          ACCESS_KEY_ID: schema.SST_AWS_ACCESS_KEY_ID,
          SECRET_ACCESS_KEY: schema.SST_AWS_SECRET_ACCESS_KEY,
          FUNCTION_NAME: `${schema.PULUMI_NODEJS_PROJECT}-${schema.PULUMI_NODEJS_STACK}-${schema.PULUMI_NODEJS_PROJECT.replace("-", "")}Function`,
          FUNCTION_REGION: "ap-south-1",
        },
      },
      {
        provider: new aws.Provider("ap-south-1", { region: "ap-south-1" }),
      },
    )

    return {
      "ap-south-1-console": pulumi.interpolate`https://ap-south-1.console.aws.amazon.com/lambda/home?region=ap-south-1#/functions/${apSouth1.name}`,
      "ap-south-1-url": pulumi.interpolate`${apSouth1.url}?key=${schema.API_KEY}&search=https://amazon.in`,
    }
  },
})
