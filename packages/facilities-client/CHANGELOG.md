# @lucass-hsa1/facilities-client

## 0.1.0

### Minor Changes

- 83b9072: Cliente fetch tipado pra Facilities-Hub (Fase 6 do plano).

  Cobertura inicial:

  - `whatsapp.send({ instanceId?, number, text })` com sanitização BR (`55…`)
  - `email.send({ to, subject, html })`
  - `image.compress(input, opts)` consumindo `POST /api/image/compress`
  - `instances.create / get / list / getQrCode / getStatus / delete`
  - `health()` (sem auth)

  API:

  ```ts
  import {
    createFacilitiesClient,
    createFacilitiesClientFromEnv,
  } from "@lucass-hsa1/facilities-client";

  const hub = createFacilitiesClient({
    baseUrl: "https://comm-hub.digivols.com.br",
    apiKey: process.env.FACILITIES_HUB_API_KEY!,
  });

  await hub.whatsapp.send({ number: "11999999999", text: "oi" });
  const result = await hub.image.compress(buffer, {
    maxWidth: 1200,
    format: "auto",
  });
  ```

  `createFacilitiesClientFromEnv()` aceita tanto `FACILITIES_HUB_*` quanto `COMM_HUB_*` (BC durante a transição).

  Erros padronizados via `FacilitiesClientError` com `statusCode` + mensagem extraída do `error`/`message` do JSON do hub.

  Timeout default 30s, abortável via AbortController.
