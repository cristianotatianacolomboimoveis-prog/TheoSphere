import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { edgeAI } from "./edge-ai";
import * as webllm from "@mlc-ai/web-llm";

// Mock @mlc-ai/web-llm
vi.mock("@mlc-ai/web-llm", () => {
  return {
    CreateMLCEngine: vi.fn().mockResolvedValue({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "Mocked offline response" } }],
          }),
        },
      },
    }),
  };
});

describe("EdgeAIService", () => {
  const originalNavigator = { ...global.navigator };

  beforeEach(() => {
    // Reset edgeAI state before each test
    // Use type assertions to access private properties
    (edgeAI as any).engine = null;
    (edgeAI as any).isInitializing = false;

    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore global navigator
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("should return false if WebGPU is not supported (navigator.gpu is undefined)", async () => {
    Object.defineProperty(global, "navigator", {
      value: { gpu: undefined },
      writable: true,
      configurable: true,
    });

    const success = await edgeAI.init();
    expect(success).toBe(false);
    expect(edgeAI.isReady()).toBe(false);
  });

  it("should return false if WebGPU adapter cannot be requested", async () => {
    const mockGpu = {
      requestAdapter: vi.fn().mockResolvedValue(null),
    };

    Object.defineProperty(global, "navigator", {
      value: { gpu: mockGpu },
      writable: true,
      configurable: true,
    });

    const success = await edgeAI.init();
    expect(success).toBe(false);
    expect(edgeAI.isReady()).toBe(false);
  });

  it("should return false if maxStorageBuffersPerShaderStage limit is insufficient (< 10)", async () => {
    const mockAdapter = {
      limits: {
        maxStorageBuffersPerShaderStage: 8,
      },
      requestDevice: vi.fn().mockRejectedValue(new Error("exceeds limit")),
    };

    const mockGpu = {
      requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
    };

    Object.defineProperty(global, "navigator", {
      value: { gpu: mockGpu },
      writable: true,
      configurable: true,
    });

    const success = await edgeAI.init();
    expect(success).toBe(false);
    expect(edgeAI.isReady()).toBe(false);
  });

  it("should return false if adapter.limits is undefined but requestDevice fails", async () => {
    const mockAdapter = {
      limits: undefined,
      requestDevice: vi.fn().mockRejectedValue(new Error("exceeds limit")),
    };

    const mockGpu = {
      requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
    };

    Object.defineProperty(global, "navigator", {
      value: { gpu: mockGpu },
      writable: true,
      configurable: true,
    });

    const success = await edgeAI.init();
    expect(success).toBe(false);
    expect(edgeAI.isReady()).toBe(false);
  });

  it("should successfully initialize if all WebGPU requirements are satisfied (>= 10)", async () => {
    const mockDevice = {
      destroy: vi.fn(),
    };
    const mockAdapter = {
      limits: {
        maxStorageBuffersPerShaderStage: 10,
      },
      requestDevice: vi.fn().mockResolvedValue(mockDevice),
    };

    const mockGpu = {
      requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
    };

    Object.defineProperty(global, "navigator", {
      value: { gpu: mockGpu },
      writable: true,
      configurable: true,
    });

    const success = await edgeAI.init();
    expect(success).toBe(true);
    expect(edgeAI.isReady()).toBe(true);
    expect(mockAdapter.requestDevice).toHaveBeenCalledWith({
      requiredLimits: {
        maxStorageBuffersPerShaderStage: 10,
      },
    });
    expect(mockDevice.destroy).toHaveBeenCalled();
    expect(webllm.CreateMLCEngine).toHaveBeenCalledWith(
      "gemma-2b-it-q4f16_1-MLC",
      expect.any(Object),
    );

    // Test text generation
    const response = await edgeAI.generate(
      "Explique a graça preveniente",
      "Você é o TheoAI",
    );
    expect(response).toBe("Mocked offline response");
  });
});
