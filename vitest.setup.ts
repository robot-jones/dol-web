import "@testing-library/jest-dom";
import "whatwg-fetch";
import React from "react";
import { TextEncoder, TextDecoder } from "util";

// Mocks for next modules typically used in components
vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => "/",
  };
});

// Avoid JSX in a TS setup file to prevent transform issues
vi.mock("next/image", () => ({ __esModule: true, default: (props: any) => {
  return React.createElement("img", props);
}}));

// Some tests import next/server types or helpers indirectly; provide a basic mock.
// Extends the real (whatwg-fetch-polyfilled) Response so `new NextResponse(...)`,
// `NextResponse.json(...)`, and `NextResponse.next()` all behave like the real thing.
vi.mock("next/server", () => {
  class MockNextResponse extends Response {
    static json(body: any, init?: any) {
      return new Response(JSON.stringify(body), init);
    }
    static next() {
      return new Response(null, { status: 200 });
    }
  }
  return { NextResponse: MockNextResponse };
});

// Polyfills for supertest/Node libs expecting Web APIs
// TextEncoder/TextDecoder are used by dependency chains (e.g., noble/hashes)
// @ts-ignore
global.TextEncoder = global.TextEncoder || TextEncoder;
// @ts-ignore
global.TextDecoder = global.TextDecoder || TextDecoder;
