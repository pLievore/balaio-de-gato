# Variáveis de ambiente

Este arquivo descreve o ambiente alvo da Balaio de Gato. Nunca versione segredos; use `.env.local` somente para desenvolvimento e o cofre do provedor nos demais ambientes.

## Base pública

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ALLOW_INDEXING=false
```

`NEXT_PUBLIC_ALLOW_INDEXING` só deve ser `true` no domínio público final.

## PostgreSQL e dados protegidos

```dotenv
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
ORDER_DATA_ENCRYPTION_KEY=...
ORDER_RESERVATION_TTL_MINUTES=1440
```

- `DATABASE_URL` é a conexão pooled usada pelo Next.js em runtime.
- `DATABASE_URL_UNPOOLED` é a conexão direta preferida por migrations, seed e
  ferramentas do Drizzle.
- `ORDER_DATA_ENCRYPTION_KEY` protege o CPF persistido e gera o índice cego de
  consulta. É **obrigatória em todo deploy** e deve ser longa, aleatória,
  exclusiva por ambiente e mantida no cofre do provedor. Trocar esse segredo
  sem um plano de rotação torna os dados existentes ilegíveis.
- `ORDER_RESERVATION_TTL_MINUTES` define, em minutos inteiros positivos, a
  validade inicial da reserva de estoque. É obrigatório em produção; `1440` é
  apenas um exemplo e deve ser calibrado com a operação Personal Net.

O fallback local temporário que deriva a proteção de dados de
`ADMIN_PANEL_SESSION_SECRET` é apenas uma compatibilidade de desenvolvimento e
não é uma configuração de deploy suportada. Defina sempre a chave dedicada
fora do ambiente local.

## Sessão administrativa

```dotenv
ADMIN_PANEL_SESSION_SECRET=...
```

Esse segredo ainda sustenta o painel legado enquanto ele permanece no código.
O novo painel terá autenticação e autorização próprias; não considere a sessão
atual como migração concluída. Segredos administrativos devem ter alta entropia
e ser diferentes por ambiente.

## Comunicação — pendente de fornecedor

```dotenv
TRANSACTIONAL_EMAIL_FROM=...
TRANSACTIONAL_EMAIL_PROVIDER_KEY=...
```

Remetente, domínio e fornecedor precisam ser validados antes da ativação.

## Personal Net / DUEPAY

O fluxo inicial não requer credencial de API porque é assistido no portal autorizado. Não crie variáveis falsas. Se a Personal Net fornecer uma API vigente, as variáveis serão definidas conforme a documentação oficial, separando sandbox e produção.

## Legado em remoção

As variáveis `SHOPIFY_*`, `SQUARE_*`, `SUPABASE_*`, `RESEND_API_KEY`, `EMAIL_FROM` e `NEXT_PUBLIC_PHONE_E164` foram removidas do projeto e do ambiente da Vercel junto com o código que as lia. Não recrie nenhuma delas.

## Ambiente atual

O deploy usa exatamente estas variáveis:

```dotenv
DATABASE_URL=postgresql://...        # Neon, pooled, usado no runtime
DATABASE_URL_UNPOOLED=postgresql://...# conexão direta, para migrations e seed
NEXT_PUBLIC_SITE_URL=https://...
NEXT_PUBLIC_ALLOW_INDEXING=false     # `true` só no domínio público final
ORDER_DATA_ENCRYPTION_KEY=...        # ≥32 bytes; cifra o CPF do responsável
ORDER_RESERVATION_TTL_MINUTES=...
ADMIN_PANEL_PASSWORD=...             # acesso ao painel
ADMIN_PANEL_SESSION_SECRET=...       # ≥32 bytes, assina o cookie de sessão
ALLOW_DEVELOPMENT_CATALOG=true       # temporária: serve o catálogo de seed
```

`ORDER_DATA_ENCRYPTION_KEY` é obrigatória em produção — sem ela o envio do
pedido lança exceção, e trocá-la torna ilegíveis os CPFs já cifrados.

A coleta de eventos do funil **não tem variável**: ela grava na tabela
`funnel_counters` do próprio PostgreSQL. Antes dependia de um Redis Upstash
(`KV_REST_API_*` / `UPSTASH_REDIS_REST_*`) que nunca foi provisionado, e por
isso ficava inerte. Não recrie essas variáveis.

`ALLOW_DEVELOPMENT_CATALOG` é um andaime: enquanto o catálogo do banco for o
seed `draft`, sem ela a loja mostra zero produtos. Ela sai quando o catálogo
oficial for publicado.
