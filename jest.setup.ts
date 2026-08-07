import "@testing-library/jest-dom";
import "whatwg-fetch";

// Mocks for next modules typically used in components
jest.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
    }),
    usePathname: () => "/",
  };
});

// Avoid JSX in a TS setup file to prevent transform issues
jest.mock("next/image", () => ({ __esModule: true, default: (props: any) => {
  const React = require("react");
  return React.createElement("img", props);
}}));

// Some tests import next/server types or helpers indirectly; provide a basic mock.
// Extends the real (whatwg-fetch-polyfilled) Response so `new NextResponse(...)`,
// `NextResponse.json(...)`, and `NextResponse.next()` all behave like the real thing.
jest.mock("next/server", () => {
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
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require("util");
  // @ts-ignore
  global.TextEncoder = global.TextEncoder || TextEncoder;
  // @ts-ignore
  global.TextDecoder = global.TextDecoder || TextDecoder;
} catch {}


