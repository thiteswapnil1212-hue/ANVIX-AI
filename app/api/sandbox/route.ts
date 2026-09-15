import { NextResponse } from "next/server";

import { SandboxManager } from "@/lib/sandbox/manager";

const sandboxManager = new SandboxManager();

function jsonError(error: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (!body || typeof body !== "object") {
      return jsonError("Request body must be a JSON object.", 400);
    }

    const action = body.action;

    if (typeof action !== "string") {
      return jsonError("Action is required.", 400);
    }

    switch (action) {
      case "create": {
        if (!body.project || typeof body.project !== "object") {
          return jsonError("Project payload is required for create action.", 400);
        }

        const result = await sandboxManager.create(body.project as any);

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: result.error || "Sandbox creation failed.",
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          sandbox: {
            id: result.sandboxId,
            status: result.status,
          },
        });
      }

      case "status": {
        const id = typeof body.id === "string" ? body.id : "";

        if (!id) {
          return jsonError("Sandbox id is required for status action.", 400);
        }

        const result = await sandboxManager.getStatus(id);

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: result.error || "Sandbox status lookup failed.",
            },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          sandbox: {
            id,
            status: result.status,
          },
        });
      }

      case "stop": {
        const id = typeof body.id === "string" ? body.id : "";

        if (!id) {
          return jsonError("Sandbox id is required for stop action.", 400);
        }

        const result = await sandboxManager.stop(id);

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: result.error || "Sandbox stop failed.",
            },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          sandbox: {
            id,
            status: result.status,
          },
        });
      }

      case "destroy": {
        const id = typeof body.id === "string" ? body.id : "";

        if (!id) {
          return jsonError("Sandbox id is required for destroy action.", 400);
        }

        const result = await sandboxManager.destroy(id);

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: result.error || "Sandbox destroy failed.",
            },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          sandbox: {
            id,
            status: result.status,
          },
        });
      }

      default:
        return jsonError("Unsupported sandbox action.", 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sandbox request failed.";
    return jsonError(message, 400);
  }
}
