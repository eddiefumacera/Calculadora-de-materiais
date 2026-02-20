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


✅ NOVO: Modo “somente materiais”
- Ative em Config: “Modo somente materiais (sem valor)”.
- Esconde a coluna Valor (k) e o card de Valor total.
- A nota fica sem valor (apenas itens + totais de materiais).


=== UPGRADES INCLUÍDOS ===
1) Busca por item (campo Buscar)
2) Filtro por categoria (dropdown)
3) Botões +/- nas quantidades
4) Link compartilhável do orçamento (Copiar link)
   - o link salva as quantidades na URL, ex.: ?item_01=2&item_05=1
5) Combos/Presets (dropdown Combos + botão Aplicar)
   - edite no catalog.json em "presets"
6) Histórico local (Salvar + Histórico)
   - salva no navegador (localStorage), até 50 entradas

=== NOTA DETALHADA ===
- A nota agora mostra valor unitário por item, parcial por linha e subtotal.


✅ RENOMEAR ITENS E CATEGORIAS (sem mexer na lista inteira)
Agora você pode renomear em um só lugar no catalog.json:

"item_names": {
  "item_01": "Nome do Item 01",
  "item_02": "Nome do Item 02"
},
"category_names": {
  "Classe 1": "Fuzilaria",
  "Classe 2": "SMG"
}

- As chaves (item_01, Classe 1, etc.) são as originais.
- O site usa esses mapas para exibir nomes/categorias e também para busca/filtro/nota.
