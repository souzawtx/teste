# Melhorias e estado da versão 2.0

A versão 2.0 preserva o jogo 2D existente e acrescenta uma camada de operação escolar mais consistente.

## Melhorias visuais mantidas
- HUD com XP, nível, corações e localização.
- Interface de ranking com avatares e pódio.
- Trilha visual de níveis.
- Painéis translúcidos, contraste e hierarquia visual refinados.
- Efeitos ambientais leves e responsividade para touch.

## Melhorias funcionais desta entrega
- Autenticação por servidor, cookies HttpOnly e senhas derivadas com scrypt.
- Sincronização centralizada de perfis, progresso, atividades, configurações e missões.
- Ranking de turma com minimização de dados exibidos.
- Mercado virtual e equipamento de itens cosméticos.
- Editor de missões com validação de alternativas e resposta correta.
- Integração efetiva das regras de corações e recuperação.
- Avaliações formativa inicial e posterior e exibição dos pares no painel da professora.
- Exportação sem credenciais e exclusão de dados de estudantes protegida por perfil de professora.

## Limitações declaradas
- Apenas o mundo de A Metamorfose está completo para exploração nesta entrega.
- As avaliações de leitura são instrumentos exploratórios de quatro itens, ainda não validados.
- O servidor usa arquivo JSON local, adequado a protótipo/uso piloto pequeno; para escala maior, recomenda-se banco de dados gerenciado e monitoramento.
- A concessão de XP e moedas ainda é iniciada no cliente; para ranking inviolável, a lógica de recompensas deverá migrar ao servidor.
- A implantação em internet requer HTTPS, política de backup e revisão da infraestrutura.
