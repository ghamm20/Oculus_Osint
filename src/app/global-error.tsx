"use client";

import Error from "next/error";

export default function GlobalError() {
  return (
    <html>
      <body>
        <Error statusCode={500} title="Error" />
      </body>
    </html>
  );
}
