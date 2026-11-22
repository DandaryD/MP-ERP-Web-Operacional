# MP ERP Web — MVP administrativo

Baseado no `MP/index.html` do ZIP original. O app é servido como site web pelo Cloudflare Worker e usa D1 para centralizar os dados entre computador e celular.

## Módulos preservados do HTML funcional
Dashboard, Vendas/PDV, Produtos/Estoque, Clientes, Financeiro e Relatórios.

## Publicar
1. Instale Node.js LTS.
2. Na pasta do projeto, rode `npm install`.
3. Rode `npx wrangler login`.
4. Crie o banco: `npx wrangler d1 create mp-moveis-erp`.
5. Copie o `database_id` retornado para `wrangler.toml`, substituindo `PREENCHER_COM_ID_DO_D1`.
6. Crie a tabela: `npx wrangler d1 execute mp-moveis-erp --remote --file=database/schema.sql`.
7. Configure a senha administrativa: `npx wrangler secret put ADMIN_PASSWORD`.
8. Configure o segredo da sessão: `npx wrangler secret put SESSION_SECRET` (use uma chave aleatória forte, por exemplo `openssl rand -base64 48`).
9. Publique: `npx wrangler deploy`.

O Worker hospeda a interface e a API no mesmo domínio `workers.dev`. Após deploy, acesse o endereço fornecido e entre com a senha definida no passo 7.

## Testar localmente
Crie `.dev.vars` na raiz (não envie ao Git):
```
ADMIN_PASSWORD="senha-local-forte"
SESSION_SECRET="chave-local-aleatoria-com-pelo-menos-32-caracteres"
```
Depois execute `npx wrangler dev`.

## Importante
- Esta versão não usa localStorage para persistir dados: a API salva estado centralizado no D1.
- Sessão assinada com HMAC e cookie HttpOnly, Secure, SameSite=Strict, validade de 8 horas.
- MVP de administrador único; não há cadastro de usuários.
- A aplicação salva clientes, produtos, vendas e financeiro como um documento JSON em uma linha D1. É simples para o MVP, mas não é desenho definitivo para escalar.
- Carrinho de venda é temporário no navegador até finalizar a venda.
- Ainda não inclui orçamentos/produção porque esses módulos não estavam implementados no HTML funcional fornecido; o diretório `src/js` contém arquivos vazios para esses módulos.
- O HTML original usa templates com strings interpoladas. Antes de operação com dados externos ou escala, revisar escape contra XSS, validação de domínio, rate limit de login e auditoria.
- Faça backups D1 e teste primeiro com dados fictícios. A publicação não foi executada nesta entrega.
