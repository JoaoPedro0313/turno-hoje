# Sistema RDO · Mariuá

Sistema separado do site turno-hoje, com duas partes. A **gestão**, para o escritório, fica em `https://joaopedro0313.github.io/SISTEMA-RDO/`. O **app de campo**, para o encarregado lançar o RDO com fotos no celular, fica em `https://joaopedro0313.github.io/SISTEMA-RDO/campo/`. O sistema usa o mesmo banco (Supabase) e as mesmas contas do sistema Mariuá, e por isso lê de lá o Cadastro de Equipes e a Programação, mas não depende de nenhum arquivo do turno-hoje.

## O que tem no repositório

O `index.html`, o `gestao.css` e o `gestao-app.js` são a gestão, e o `modo.js` diz se o sistema abre em modo de teste ou no real. O `rdo-app.js` abre o RDO com as fotos, importa a lista de serviços e mostra o QR code de instalação. O `rdo_campo.sql` tem tudo o que o banco precisa. A pasta `campo/` é o app, a pasta `demo/` é o modo de teste, e as pastas `baixar/` e `apk/` são a página de download e os APKs para Android. O `logo-mariua.png` é o logo usado na gestão e na impressão do RDO.

## Como colocar no ar

Primeiro, no Supabase, abra SQL Editor → New query, cole o `rdo_campo.sql` inteiro e clique em Run; pode rodar de novo sem perder nada. Depois, no GitHub, em Settings → Pages, escolha "Deploy from a branch", o ramo `main` e a pasta `/ (root)`, e salve: em um ou dois minutos os dois endereços ficam no ar.

Para o "Esqueci a senha" voltar para o Sistema RDO, no Supabase, em Authentication → URL Configuration → Redirect URLs, acrescente `https://joaopedro0313.github.io/SISTEMA-RDO/**`. Sem isso, o link de senha nova continua indo para o site do sistema Mariuá, que também funciona.

Por fim, entre na gestão com um usuário gestor, importe a lista de serviços e libere o acesso das pessoas do escritório, as duas coisas em Configurações. O botão "Instalar no celular" mostra o QR code e o link do app para os encarregados.

## Modo do sistema: teste ou real

O arquivo `modo.js`, na raiz, diz em que modo o sistema abre. Com `'teste'`, como está agora, todos os endereços abrem o modo de teste: `…/SISTEMA-RDO/` vai para a gestão de teste e `…/SISTEMA-RDO/campo/` para o app de teste, inclusive pelo APK RDO Mariuá. Quando o banco estiver pronto, com o `rdo_campo.sql` rodado no Supabase, troque para `'real'`: no GitHub, abra o `modo.js`, clique no lápis (Edit), troque `teste` por `real` e clique em Commit changes. Em um ou dois minutos o sistema de verdade volta a abrir, com login. Os dados do teste ficam guardados à parte e não se misturam com os de verdade.

## Baixar o app (APK)

A página `https://joaopedro0313.github.io/SISTEMA-RDO/baixar/` tem os dois APKs para Android e o passo a passo de instalação: o **RDO Mariuá**, o app de verdade, com login, e o **RDO Teste**, que abre o modo de teste sem login. Os arquivos ficam na pasta `apk/` (`rdo-mariua.apk` e `rdo-teste.apk`). No iPhone, a página explica como usar o app pelo Safari; no computador, mostra um QR code para abrir a página no celular. O botão "Instalar no celular" da gestão leva a essa página. O código dos APKs e a chave de assinatura não ficam no repositório: guarde-os à parte.

## Modo de teste (sem login)

A pasta `demo/` é uma versão de teste do sistema, sem login e sem banco. A gestão de teste fica em `https://joaopedro0313.github.io/SISTEMA-RDO/demo/` e o app de teste em `https://joaopedro0313.github.io/SISTEMA-RDO/demo/campo/`. Elas usam o mesmo código do sistema real, mas no lugar do Supabase há um banco simulado, guardado só no navegador, com uma semana de RDOs de exemplo, as equipes, a programação do dia e a lista de serviços. Nada vai para o banco de verdade, e o teste funciona mesmo antes de rodar o `rdo_campo.sql`.

A gestão de teste abre como gestor e o app de teste como o encarregado Alan. Abertas as duas no mesmo navegador, o RDO enviado pelo app de teste aparece na gestão de teste na hora. O selo "MODO DE TESTE", no topo, recomeça o teste com os dados iniciais; os dados de exemplo também se renovam sozinhos a cada dia. Para testar outro usuário, toque em Sair e entre com joao.araujo (gestor), maria.escritorio (escritório), alan ou bruno (encarregados), com qualquer senha. No celular, o app de teste funciona sozinho, com os dados guardados no próprio aparelho. Para tirar o modo de teste do ar, apague a pasta `demo/` do repositório.

## Quem entra

Na gestão entram os gestores (os mesmos do sistema Mariuá) e quem um gestor liberar em Configurações → Acesso à gestão, pelo usuário ou pelo e-mail da conta. O encarregado entra só no app; se tentar a gestão, vê um aviso com o link do app. As contas continuam sendo criadas no Admin do sistema Mariuá. No banco, cada encarregado lê só os próprios RDOs, e quem tem acesso à gestão lê todos, com as fotos e os celulares.

O login é por usuário e senha, nas duas partes. O usuário é o começo do e-mail da conta, antes do @ (joao.araujo para joao.araujo@empresa), e o e-mail inteiro também funciona. Se não houver e-mail com esse começo, o sistema procura pela matrícula do cadastro.

## A gestão

A Visão geral mostra os números do período (RDOs recebidos, equipes que mandaram, fotos, horas paradas, serviços fora da lista e celulares com fila parada), quem estava programado hoje e ainda não mandou RDO, e o que precisa ser conferido. Em RDOs ficam todos os RDOs do período, com busca, filtros, o RDO completo com fotos e download em CSV. Produção soma a quantidade de cada serviço da lista, por serviço ou por equipe, também com CSV. Equipes mostra a situação de cada equipe do Cadastro, e Celulares mostra a versão do app, o último contato e a fila de envio de cada celular. Em Configurações, o gestor define o recado para os encarregados, as fotos mínimas por RDO, se o horário de término é obrigatório, os motivos de paralisação e a versão mínima do app, além da lista de serviços, do QR code e do acesso à gestão.

## O app de campo

O encarregado entra com usuário e senha, escolhe a equipe uma vez e vê o que está programado para o dia. O RDO já vem com a obra da Programação; ele marca o clima, quem trabalhou, aponta os serviços pela lista e tira as fotos, que saem carimbadas com data, hora, equipe, GPS e obra. Tudo fica salvo no celular enquanto ele preenche, e o app funciona sem internet: ao tocar em Enviar, o RDO entra numa fila e sobe sozinho quando o celular pega sinal, sem duplicar. O envio acontece com o app aberto.

## Lista de serviços (apontamento)

O encarregado aponta o que a equipe fez escolhendo o serviço na mesma lista do sistema da concessionária (a precificação de serviços, com códigos como BA_01). Ele procura pelo nome ou pelo código, filtra por grupo (linha morta, linha viva, poda, LC, retro) e informa a quantidade na unidade do serviço: poste é número inteiro, cabo em metro e condutor em kg aceitam casas decimais, conforme a coluna "Nº Casas Decimais" do arquivo. Quando o RDO começa pela Programação, a atividade programada aparece como dica e os serviços parecidos vêm primeiro; os serviços mais usados no celular também ficam no topo. Se um serviço não estiver na lista, ele pode ser apontado escrevendo, e chega ao escritório marcado como "fora da lista".

Para carregar ou atualizar a lista, exporte a precificação de serviços no sistema da concessionária e, na gestão, em Configurações, clique em "Lista de serviços" → "Importar precificação (.csv)". O site mostra quantos serviços são novos, alterados ou saem da lista antes de gravar. A lista nova substitui a do mesmo contrato; o que saiu fica inativo, sem apagar o histórico. Só gestor pode importar (a função do banco confere pelo `is_gestor()`). Os preços do arquivo não são gravados: o app não precisa deles e o encarregado não vê valores. Os celulares pegam a lista nova quando abrem o app com internet; ela fica guardada para funcionar sem sinal.

Hoje o arquivo tem um contrato (OBRAS - BA). Se vierem listas de outros contratos, cada equipe vê a do seu estado, pelo final do código da equipe (IRC, JAC, FSA e SRR na Bahia; PA e ITA em Minas; AJU em Sergipe).

## Espaço das fotos

Cada foto fica com cerca de 250 a 450 KB (lado maior de 1600 px). Com 80 equipes mandando 6 fotos por dia, são uns 170 MB por dia, então confira o limite de armazenamento do plano do Supabase de vocês. Para fotos menores, ajuste `FOTO_LADO` e `FOTO_QUALIDADE` no começo do `campo/app.js`.

## Publicar uma versão nova do app

Depois de mudar qualquer arquivo de `campo/`, abra o `campo/sw.js` e troque o `VERSAO` (por exemplo de `1.2.1` para `1.2.2`). Esse é o único lugar da versão: o app e a página de gestão leem dali. No mesmo arquivo, as `NOVIDADES` são até três linhas curtas que aparecem no aviso para o encarregado; vale escrever o que mudou para ele, em palavras do dia a dia.

O celular confere se há versão nova ao abrir o app, ao voltar para ele, quando a internet volta e a cada 15 minutos com o app aberto. A versão nova baixa em segundo plano e, quando fica pronta, aparece o aviso "Nova versão do app" com Atualizar agora e Depois. Atualizar agora troca na hora: o rascunho fica salvo, um envio de fotos em andamento termina antes, e o app volta para a mesma tela. Quem toca em Depois continua na versão atual; a atualização fica como recado na tela inicial e o aviso volta na próxima vez que ele abrir o app. Em Ajustes, "Procurar atualização do app" confere na hora.

Para exigir a versão nova, coloque-a em Versão mínima, nas Configurações da gestão: o aviso aparece sem o botão Depois. Na aba Celulares da gestão dá para ver quem já atualizou.

## Programação visual

A tela `programacao_visual.html` (menu Obras → Prog. Visual) monta a programação das obras da carteira:
- **Gantt:** uma linha por obra.
- **Turmas pesadas:** o que cada encarregado faz em cada dia, com cavas, postes e cabo.
- **Quadro por equipe e programação do dia:** com o texto para copiar e mandar às equipes.
- **Serviços por obra.**
- **Visão geral:** fechamento do mês e postes previstos por encarregado.

Para liberar a tela, vá ao Admin → Telas liberadas e marque "Programação visual" (grupo Operação diária). Gestor já vê.

**Atualizar os dados:** clique em "Carregar planilha", escolha a planilha UTD JACOBINA – CARTEIRAS DE OBRAS (.xlsx), a aba do mês (por exemplo NOV.26) e a data da planilha. A programação começa no dia útil seguinte a essa data.

A tela grava as obras em `turno_data` (chave `prog_visual_obras`), e todo mundo que abre a tela passa a ver a mesma programação, com o nome de quem carregou e quando. Enquanto ninguém carregar uma planilha, a tela usa a carteira de novembro que vem dentro do próprio arquivo, com dados de 24/11/2026.

A leitura da planilha acontece no navegador, com o SheetJS baixado do cdnjs na primeira vez, então precisa de internet. Da planilha só entram os campos da programação. Das pessoas, só o nome do encarregado, sem a matrícula, e as coordenadas são arredondadas a cerca de 1 km.

As premissas (equipes, produtividade, metas, prazo do mês, apoio entre turmas) e os serviços marcados à mão por obra ficam guardados no navegador de cada pessoa.

Para a tela aparecer no menu e nas permissões, foram alterados:
- `nav.js`: item do menu.
- `mariua-auth.js`: catálogo de telas, id `progvisual`.
- `admin.html`: lista de telas liberadas.
- `mariua-ui.js`: descrição no Início.
- `index.html`: cor do cartão.

Depois de publicar, recarregue com Ctrl+F5 para o navegador pegar o menu novo.
