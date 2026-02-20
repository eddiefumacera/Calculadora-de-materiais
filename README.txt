CALCULADORA RP (SITE) — OPÇÃO A (pré-preenchido)

✅ O que muda aqui
- O site já vem com 12 itens preenchidos (Item 01–Item 12) e valores/receitas no catalog.json.
- Os materiais são genéricos: Material A–E.
- Você pode renomear os itens e as categorias no catalog.json quando quiser.

1) EDITAR NOMES / CATEGORIAS / VALORES
Abra: catalog.json
- name: nome do item na tabela
- category: categoria
- value_k: valor em "k"
- recipe: materiais por unidade (a,b,c,d,e)

2) LOGO
O logo está em: assets/logo.png

3) HOSPEDAR (GitHub Pages)
- Suba os arquivos descompactados para um repositório
- Settings > Pages > Deploy from branch (main / root)
- Use o link no Discord



✅ RENOMEAR MATERIAIS (sem quebrar o cálculo)
- NÃO mude as chaves do recipe (a, b, c, d, e). Elas são as colunas internas.
- Para mudar apenas o NOME que aparece no site, edite no topo do catalog.json:

"materials": {
  "a": "Material A",
  "b": "Material B",
  "c": "Material C",
  "d": "Material D",
  "e": "Material E"
}

Exemplo de nomes:
"materials": {"a":"Molas","b":"Canos","c":"Gatilhos","d":"Pratas","e":"Bronzes"}
