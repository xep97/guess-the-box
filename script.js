    // 1. SUPABASE CONFIGURATION
    const SB_URL = 'https://divvzcjugsiyucpemaxi.supabase.co';
    const SB_KEY = 'sb_publishable_V_pwDKJpFaPGs0tNYi-Jhg_sjwdiFt_';
    
    // Use a different variable name to avoid conflict with the global library object
    const client = supabase.createClient(SB_URL, SB_KEY);

    // 2. GAME STATE
    let currentStreak = 0;
    let playerId = localStorage.getItem('box_game_pid') || crypto.randomUUID();
    let username = localStorage.getItem('box_game_name');

    localStorage.setItem('box_game_pid', playerId);

    // 3. STARTUP LOGIC
    if (username) {
        showGame();
    }

    function initUser() {
        const input = document.getElementById('username-input').value.trim();
        if (input.length < 1) return alert("Please enter a name!");
        username = input;
        localStorage.setItem('box_game_name', username);
        showGame();
    }

    function showGame() {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        document.getElementById('player-welcome').innerText = `👋 ${username}`;
        resetGame();
    }

    // 4. GAMEPLAY MECHANICS
    function resetGame() {
        currentStreak = 0;
        updateUI();
        renderRound();
        fetchLeaderboard();
    }

    function renderRound() {
        const container = document.getElementById('box-container');
        const diff = parseInt(document.getElementById('diff-select').value);
        const winningIndex = Math.floor(Math.random() * diff);
        
        // Dynamically adjust grid columns
        let cols = 2;
        if (diff === 3) cols = 3;
        if (diff >= 5) cols = 5;
        container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        
        container.innerHTML = '';

        for (let i = 0; i < diff; i++) {
            const box = document.createElement('div');
            box.className = 'box';
            box.onclick = () => handleChoice(i === winningIndex);
            container.appendChild(box);
        }
    }

    async function handleChoice(isCorrect) {
        const diff = parseInt(document.getElementById('diff-select').value);
        
        if (isCorrect) {
            currentStreak++;
            updateUI();
            renderRound();
        } else {
            const finalScore = currentStreak;
            currentStreak = 0;
            updateUI();
            
            if (finalScore > 0) {
                // Show simple feedback before refreshing
                alert(`Wrong box! Your streak of ${finalScore} has been saved.`);
                await saveScore(finalScore, diff);
                fetchLeaderboard();
            } else {
                alert("Wrong box! Try again.");
            }
            renderRound();
        }
    }

    function updateUI() {
        document.getElementById('streak-count').innerText = currentStreak;
    }

    // 5. DATABASE CALLS
    async function saveScore(score, difficulty) {
        try {
            const { error } = await client
                .from('high_scores')
                .insert([{ 
                    player_id: playerId, 
                    username: username, 
                    difficulty: difficulty, 
                    streak: score 
                }]);
            if (error) throw error;
        } catch (err) {
            console.error("Error saving to Supabase:", err.message);
        }
    }

    async function fetchLeaderboard() {
        const diff = parseInt(document.getElementById('diff-select').value);
        try {
            const { data, error } = await client
                .from('high_scores')
                .select('*')
                .eq('difficulty', diff)
                .order('streak', { ascending: false })
                .limit(10);

            if (error) throw error;

            const tbody = document.getElementById('leaderboard-body');
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No scores yet. Be the first!</td></tr>';
                return;
            }

            tbody.innerHTML = data.map((entry, index) => `
                <tr class="${entry.player_id === playerId ? 'is-me' : ''}">
                    <td>#${index + 1}</td>
                    <td>${entry.username} ${entry.player_id === playerId ? '(You)' : ''}</td>
                    <td>${entry.streak}</td>
                </tr>
            `).join('');
        } catch (err) {
            console.error("Error fetching leaderboard:", err.message);
        }
    }
