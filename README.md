# Liga dos Leitores — A Jornada Literária (versão 2.3.1)

Plataforma educacional gamificada para atividades de Língua Portuguesa e Literatura. O estudante cria seu avatar, explora a Praça da Liga, percorre o mundo jogável de **A Metamorfose**, realiza missões e acompanha sua evolução. A professora administra turmas, configura regras, publica missões e consulta os registros disponíveis.

## Requisitos

- Node.js 18 ou superior.
- Navegador atualizado (Chrome, Edge, Firefox ou Safari).
- Para acessar de vários computadores, o servidor precisa ficar ligado e acessível na rede local ou hospedado em um serviço com HTTPS.

O projeto não usa dependências de terceiros no servidor: utiliza módulos nativos do Node.js.

## Instalação inicial

1. Extraia o ZIP para uma pasta.
2. Instale o Node.js 18 ou superior, caso ainda não esteja instalado.
3. (Opcional) Copie `.env.example` para `.env` caso queira alterar a porta ou o host. Não é necessário preencher usuário e senha da professora: a primeira conta poderá ser criada pela própria tela do site.
4. Abra o terminal dentro da pasta do projeto e execute:

```bash
npm start
```

5. No computador que está executando o servidor, acesse `http://localhost:4173`.

No primeiro acesso, abra `http://localhost:4173`, selecione a aba **Professora** e clique em **Configurar primeiro acesso da professora**. Crie um usuário e uma senha com pelo menos 10 caracteres. Por segurança, essa configuração inicial só é permitida no próprio computador que executa o servidor. Depois de criada, entre com essas credenciais normalmente. **Não compartilhe a senha da professora com estudantes.** Como alternativa avançada, a conta também pode ser provisionada por `TEACHER_USERNAME` e `TEACHER_PASSWORD` no `.env`.

## Acesso pela rede da escola

O servidor escuta em `0.0.0.0`. Em um computador da mesma rede, acesse o endereço IP do computador servidor, por exemplo `http://192.168.0.20:4173`. O IP é apenas um exemplo: substitua pelo endereço real do computador que hospeda o jogo. Pode ser necessário liberar a porta 4173 no firewall da rede escolar.

Para publicar na internet, use HTTPS por meio de um proxy reverso ou serviço de hospedagem, configure `NODE_ENV=production` e mantenha `.env` e `data/` fora de qualquer diretório público. Não exponha o servidor diretamente à internet sem HTTPS e revisão de segurança da infraestrutura.

## Como os dados são guardados

- As senhas não são armazenadas em `localStorage`: o servidor utiliza derivação de chave com `scrypt` e salt individual.
- A sessão usa cookie `HttpOnly` e `SameSite=Strict`.
- A primeira conta de professora pode ser criada pela tela do site somente no próprio computador que executa o servidor; depois disso, a configuração fica bloqueada.
- Estudantes podem criar contas próprias. O código da turma é validado contra a lista cadastrada pela professora.
- O progresso, o avatar, as tentativas e as avaliações são enviados ao servidor. Os eventos de início, erro e conclusão de missão agora são sincronizados para compor os relatórios.
- O ranking retorna somente apelido, avatar, XP, missões concluídas e contadores de acerto/erro; não expõe respostas nem resultados diagnósticos dos colegas.
- O cache local é apagado ao encerrar a sessão ou quando a aplicação detecta que não há sessão válida; os registros oficiais permanecem no servidor.
- O ranking de estudantes mostra apenas colegas que informaram o mesmo código de turma. Sem código de turma, aparece apenas o próprio estudante. No primeiro acesso, informe o código fornecido pela professora para entrar no grupo correto.
- Os dados ficam em `data/liga-db.json`, arquivo privado que o servidor cria automaticamente. Faça cópias de segurança periódicas dessa pasta, com o servidor parado.
- O botão de exportação do painel exporta informações de trabalho sem hashes ou senhas.
- **Compatibilidade com a versão anterior:** dados que estavam apenas no `localStorage` do navegador não são migrados automaticamente para o novo banco central. Antes de substituir a versão antiga, exporte e guarde os registros que precisar preservar; depois, crie as contas na nova versão e reconstrua apenas os dados que puderem ser conferidos.

**Limite técnico importante:** esta versão centraliza dados e protege o acesso básico, mas a pontuação do jogo ainda é atualizada pelo cliente autenticado. Um usuário tecnicamente experiente poderia adulterar o XP ou as moedas no próprio navegador. O ranking deve ser usado como incentivo pedagógico, não como competição de alto risco ou resultado oficial inviolável. Uma futura versão pode mover toda a lógica de concessão de XP/moedas e validação das respostas para o servidor.

## Se o cadastro não avançar

- Abra o site em `http://localhost:4173` (não use `http://localhost:5500`).
- A porta 5500 é normalmente usada pelo Live Server, que serve apenas os arquivos estáticos e não atende as rotas de cadastro `/api`.
- Nesta versão, se a página for aberta por engano na porta 5500, ela redireciona automaticamente para a porta 4173.
- No primeiro acesso da professora, selecione **Professora** e clique em **Configurar primeiro acesso da professora**. Crie uma conta que não seja igual ao usuário de um estudante.
- No primeiro acesso do estudante, selecione **Estudante**, digite um nome de usuário de pelo menos 3 caracteres e uma senha com pelo menos 8 caracteres. Clique em **Entrar ou criar conta**. Depois da criação, o site deverá abrir a personalização do avatar.
- Se o nome `aluno1` já foi criado como estudante, ele deve ser usado na aba **Estudante**, não na aba **Professora**.

## Primeiro acesso do estudante

1. Na aba **Estudante**, informe um nome de usuário de 3 a 32 caracteres (letras sem acento, números, ponto, hífen ou sublinhado) e uma senha de pelo menos 8 caracteres.
2. Informe o código de turma fornecido pela professora. O preenchimento é opcional, mas necessário para aparecer no ranking coletivo da turma.
3. No primeiro acesso, a conta é criada no servidor e o estudante personaliza seu avatar.
4. A avaliação inicial de leitura aparece no primeiro acesso ao jogo. Ela não concede nem retira XP, moedas ou corações.
5. Depois de concluir ao menos uma missão, o estudante poderá abrir o menu de pausa e realizar a avaliação posterior.

## Funcionalidades implementadas nesta versão

### Jogo
- Criação e personalização de avatar individual.
- Movimentação 2D por WASD, setas e joystick virtual.
- Colisões, câmera que acompanha o jogador, objetos e NPCs.
- Praça da Liga e mundo jogável de **A Metamorfose**.
- Missões com trechos, perguntas, alternativas, dicas e feedback.
- Diário de missões com possibilidade de iniciar missões criadas pela professora.
- Corações iniciais configuráveis e recuperação automática ou após revisão.
- XP, níveis, moedas, trilha de progressão, ranking por turma e conquistas.
- Mercado virtual funcional com itens cosméticos e inventário/equipamento.
- Salvamento e sincronização do progresso com o servidor.
- Avaliação inicial e posterior com questões paralelas para compreensão literal, inferência, interpretação e análise crítica.

### Painel da professora
- Visão geral e lista de estudantes cadastrados.
- Criação e edição de missões personalizadas no mundo jogável.
- Configuração da quantidade de corações, XP padrão para novas missões e recuperação de corações.
- Cadastro de turmas e códigos para agrupar o ranking.
- Relatórios de missões, tentativas e avaliações inicial/posterior quando houver pares de dados reais.
- Exportação JSON sem senhas ou hashes.
- Exclusão de contas de estudantes e missões personalizadas mediante confirmação dupla.

## Mundos literários

O mundo **O Enigma da Metamorfose** é o mundo jogável entregue nesta versão. Os demais títulos do relatório — **O Diário de Anne Frank**, **Vidas Secas**, **Iracema**, **A Cartomante** e **O Alienista** — permanecem como possibilidades de expansão; não são apresentados como cenários jogáveis completos.

A professora pode criar missões adicionais vinculadas ao mundo de A Metamorfose. Para adicionar um novo mundo explorável, ainda será necessário desenvolver seu mapa, colisões, personagens, objetos, diálogos, missões e testes.

## Avaliações e interpretação dos dados

A avaliação inicial e a posterior são instrumentos formativos de quatro itens, com questões paralelas e uma questão por habilidade. Elas servem para organizar um acompanhamento exploratório; não são testes padronizados ou validados. Antes de utilizá-las como instrumento central de pesquisa, a equipe deve revisar os itens, critérios e adequação à faixa etária com especialistas e registrar os procedimentos éticos necessários.

Os resultados da plataforma não substituem as notas escolares e não demonstram, isoladamente, que a plataforma causou mudanças na aprendizagem. Registre número de participantes, ausências, condições de aplicação, versões das atividades e limitações. Para pesquisa com menores, observe autorizações institucionais, consentimento dos responsáveis, assentimento dos estudantes e LGPD.

## Verificações técnicas

Executar verificações de sintaxe:

```bash
npm run check
```

Verificar se o serviço está ativo:

```bash
curl http://localhost:4173/api/health
```

Testar a experiência em computador e celular: cadastro/login de estudante, login da professora, escolha e salvamento do avatar, movimentação, colisões, abertura do portal, missão correta/incorreta, recuperação de corações, conclusão e recompensa, compra/equipamento de itens, criação de missão no painel, acesso de estudante a essa missão, ranking com dois perfis da mesma turma, avaliação inicial/posterior, exportação e restauração de dados.

## Cópia de segurança

1. Pare o servidor (`Ctrl+C`).
2. Copie a pasta `data/` para um local seguro, com acesso restrito.
3. Reinicie o servidor.

Não publique cópias do banco de dados: podem conter dados pessoais e registros de estudantes.


## Solução de problemas de acesso (v2.3.1)

- Abra o projeto pela URL `http://localhost:4173`, não pelo Live Server na porta 5500.
- Pare qualquer servidor antigo com `Ctrl+C` e inicie `npm start` dentro desta pasta.
- Se a página já estava aberta, faça uma recarga forçada (`Ctrl+Shift+R`). Os arquivos JS/CSS agora usam cabeçalhos sem cache para evitar incompatibilidade entre versões.
- Na aba Professora, se ainda não houver conta, a tela mostrará a configuração do primeiro acesso. Se já houver uma conta, use exatamente o usuário e a senha criados anteriormente.
- Erros de autenticação agora também aparecem no texto de ajuda do formulário, além da notificação.


## Escopo alinhado ao relatório do projeto

Esta versão mantém a **Praça da Liga**, a criação de avatar e o mundo jogável de **A Metamorfose**. Os outros títulos citados no relatório — **O Diário de Anne Frank**, **Vidas Secas**, **Iracema**, **A Cartomante** e **O Alienista** — aparecem como possibilidades de expansão/portais bloqueados, não como mundos jogáveis completos.

Para iniciar sem configurar manualmente o terminal, use `INICIAR-LIGA.sh` no Linux ou `INICIAR-LIGA.bat` no Windows. Leia primeiro `LEIA-ME-PRIMEIRO.txt`. A pasta `data/` começa vazia e o servidor cria o banco local automaticamente. Não distribua cópias dessa pasta depois que houver estudantes cadastrados.

O relatório escolar apresenta evolução das notas do 8º ano B durante o período da experiência, mas ressalta que esses indicadores não isolam o efeito da plataforma e não comprovam, por si só, ganho específico de compreensão leitora. O painel do sistema deve ser alimentado por registros da própria plataforma; não misture as notas agregadas do boletim com métricas de uso.
