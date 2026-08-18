document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const rubricSearchInput = document.getElementById('rubric_search_input');
    const searchDropdown = document.getElementById('search_results_dropdown');
    const searchSpinner = document.getElementById('search_spinner');
    const symptomCardsContainer = document.getElementById('symptom_cards_container');
    const symptomCountSpan = document.getElementById('symptom_count');
    const clearSymptomsBtn = document.getElementById('clear_symptoms_btn');
    const btnRunRepertorization = document.getElementById('btn_run_repertorization');
    const outputContainer = document.getElementById('repertorization_output_container');
    const analysisStatus = document.getElementById('analysis_status');

    // Preset Buttons
    const presetNux = document.getElementById('preset_nux');
    const presetSulph = document.getElementById('preset_sulph');
    const presetAcon = document.getElementById('preset_acon');

    // Modal Drawer Elements
    const modalBackdrop = document.getElementById('remedy_modal_backdrop');
    const modalCloseBtn = document.getElementById('modal_close_btn');
    const modalContent = document.getElementById('modal_drawer_content');

    // State
    let selectedSymptoms = [];
    let searchDebounceTimer = null;
    let currentAnalysisResponse = null;

    // Event Listeners
    rubricSearchInput.addEventListener('input', handleSearchInput);
    clearSymptomsBtn.addEventListener('click', clearAllSymptoms);
    btnRunRepertorization.addEventListener('click', runRepertorization);
    modalCloseBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });

    if (presetNux) presetNux.addEventListener('click', () => loadPresetCase('nux'));
    if (presetSulph) presetSulph.addEventListener('click', () => loadPresetCase('sulph'));
    if (presetAcon) presetAcon.addEventListener('click', () => loadPresetCase('acon'));

    // Live Rubric Search
    function handleSearchInput(e) {
        const query = e.target.value.trim();
        if (query.length < 2) {
            searchDropdown.style.display = 'none';
            return;
        }

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            fetchRubrics(query);
        }, 200);
    }

    async function fetchRubrics(query) {
        try {
            const res = await fetch(`/api/rubrics/search?q=${encodeURIComponent(query)}&limit=15`);
            const data = await res.json();
            renderSearchResults(data);
        } catch (err) {
            console.error('Rubric search error:', err);
        }
    }

    function renderSearchResults(results) {
        if (!results || results.length === 0) {
            searchDropdown.innerHTML = '<div class="search-result-item" style="color: var(--text-muted);">No matching rubrics found</div>';
            searchDropdown.style.display = 'block';
            return;
        }

        searchDropdown.innerHTML = results.map(r => `
            <div class="search-result-item" data-id="${r.rubric_id}" data-text="${escapeHtml(r.fullpath)}">
                <div class="result-fullpath">${highlightMatch(escapeHtml(r.fullpath), rubricSearchInput.value)}</div>
                <div class="result-edition">Edition: ${r.abbrev.toUpperCase()} | ID: #${r.rubric_id}</div>
            </div>
        `).join('');

        searchDropdown.style.display = 'block';

        // Add Click handlers to search items
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.getAttribute('data-id'));
                const text = item.getAttribute('data-text');
                addSymptom(id, text);
                rubricSearchInput.value = '';
                searchDropdown.style.display = 'none';
            });
        });
    }

    // Add Symptom to Totality List
    function addSymptom(rubricId, rubricText, hierarchy = 'particular', weight = 1, modality = 'none') {
        if (selectedSymptoms.some(s => s.rubric_id === rubricId)) {
            return; // Already added
        }

        selectedSymptoms.push({
            rubric_id: rubricId,
            rubric_text: rubricText,
            hierarchy: hierarchy,
            intensity_weight: weight,
            modality: modality
        });

        renderSymptomCards();
    }

    function renderSymptomCards() {
        symptomCountSpan.textContent = selectedSymptoms.length;

        if (selectedSymptoms.length === 0) {
            symptomCardsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <p>No rubrics added yet. Use search above to select rubrics for case analysis.</p>
                </div>
            `;
            return;
        }

        symptomCardsContainer.innerHTML = selectedSymptoms.map((sym, index) => `
            <div class="symptom-card" data-index="${index}">
                <button class="btn-remove-symptom" onclick="removeSymptom(${index})">&times;</button>
                <div class="symptom-title">${escapeHtml(sym.rubric_text)}</div>
                <div class="symptom-controls">
                    <select onchange="updateSymptomField(${index}, 'hierarchy', this.value)">
                        <option value="particular" ${sym.hierarchy === 'particular' ? 'selected' : ''}>Particular</option>
                        <option value="physical_general" ${sym.hierarchy === 'physical_general' ? 'selected' : ''}>Physical General</option>
                        <option value="mental_general" ${sym.hierarchy === 'mental_general' ? 'selected' : ''}>Mental General</option>
                    </select>
                    <select onchange="updateSymptomField(${index}, 'intensity_weight', parseInt(this.value))">
                        <option value="1" ${sym.intensity_weight === 1 ? 'selected' : ''}>Intensity 1</option>
                        <option value="2" ${sym.intensity_weight === 2 ? 'selected' : ''}>Intensity 2</option>
                        <option value="3" ${sym.intensity_weight === 3 ? 'selected' : ''}>Intensity 3</option>
                        <option value="4" ${sym.intensity_weight === 4 ? 'selected' : ''}>Intensity 4</option>
                    </select>
                    <select onchange="updateSymptomField(${index}, 'modality', this.value)">
                        <option value="none" ${sym.modality === 'none' ? 'selected' : ''}>No Modality</option>
                        <option value="aggravation" ${sym.modality === 'aggravation' ? 'selected' : ''}>Aggravation</option>
                        <option value="amelioration" ${sym.modality === 'amelioration' ? 'selected' : ''}>Amelioration</option>
                    </select>
                </div>
            </div>
        `).join('');
    }

    window.removeSymptom = function(index) {
        selectedSymptoms.splice(index, 1);
        renderSymptomCards();
    };

    window.updateSymptomField = function(index, field, value) {
        if (selectedSymptoms[index]) {
            selectedSymptoms[index][field] = value;
        }
    };

    function clearAllSymptoms() {
        selectedSymptoms = [];
        renderSymptomCards();
    }

    // Run Repertorization Calculation
    async function runRepertorization() {
        if (selectedSymptoms.length === 0) {
            alert('Please add at least one rubric to run case repertorization.');
            return;
        }

        const patientName = document.getElementById('patient_name').value || 'Anonymous Patient';
        const chiefComplaint = document.getElementById('chief_complaint').value || '';

        const payload = {
            patient_name: patientName,
            chief_complaint: chiefComplaint,
            symptoms: selectedSymptoms.map(s => ({
                rubric_id: s.rubric_id,
                rubric_text: s.rubric_text,
                intensity_weight: s.intensity_weight,
                hierarchy: s.hierarchy,
                modality: s.modality
            }))
        };

        analysisStatus.textContent = 'Analyzing...';
        analysisStatus.style.background = 'rgba(0, 217, 255, 0.15)';
        analysisStatus.style.color = 'var(--accent-cyan)';

        try {
            const res = await fetch('/api/repertorize?limit=25', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            currentAnalysisResponse = await res.json();
            renderAnalysisResults(currentAnalysisResponse);

            analysisStatus.textContent = 'Completed';
            analysisStatus.style.background = 'rgba(0, 230, 153, 0.15)';
            analysisStatus.style.color = 'var(--accent-emerald)';
        } catch (err) {
            console.error('Repertorization error:', err);
            analysisStatus.textContent = 'Error';
            alert('Error running repertorization analysis.');
        }
    }

    // Render Analysis Table
    function renderAnalysisResults(data) {
        if (!data || !data.candidates || data.candidates.length === 0) {
            outputContainer.innerHTML = `
                <div class="demo-intro-card">
                    <div class="intro-icon">⚠️</div>
                    <h3>No Matching Remedies Found</h3>
                    <p>No remedy mappings were found for the selected rubric combination. Try adding broader rubrics.</p>
                </div>
            `;
            return;
        }

        outputContainer.innerHTML = `
            <div class="analysis-results-wrapper">
                <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; color: var(--text-secondary);">Found <strong>${data.candidates.length} candidate remedies</strong> across ${data.total_symptoms_analyzed} rubrics</span>
                    <span style="font-size: 11px; color: var(--accent-emerald);">Click any remedy row to view clinical rationale & Materia Medica</span>
                </div>
                <table class="remedy-table">
                    <thead>
                        <tr>
                            <th style="width: 45px;">Rank</th>
                            <th>Remedy Candidate</th>
                            <th style="width: 140px;">Coverage</th>
                            <th style="width: 100px;">Weighted Score</th>
                            <th style="width: 180px;">Degree Breakdown</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.candidates.map((c, i) => {
                            const degCounts = {1:0, 2:0, 3:0, 4:0};
                            c.matched_details.forEach(d => { degCounts[d.remedy_degree] = (degCounts[d.remedy_degree] || 0) + 1; });
                            return `
                                <tr class="remedy-row" onclick="inspectRemedy(${c.remedy_id})">
                                    <td><span class="badge-rank rank-${i+1 <= 3 ? i+1 : 'other'}">${i+1}</span></td>
                                    <td>
                                        <div class="remedy-name-col">
                                            <span>${escapeHtml(c.namelong)}</span>
                                            <span class="remedy-abbrev-tag">${escapeHtml(c.nameabbrev)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style="font-size: 12px; font-weight: 600;">${c.matched_rubrics_count} / ${c.total_rubrics_count} (${c.coverage_pct}%)</div>
                                        <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 4px; overflow: hidden;">
                                            <div style="width: ${c.coverage_pct}%; height: 100%; background: var(--accent-emerald);"></div>
                                        </div>
                                    </td>
                                    <td style="font-size: 14px; font-weight: 700; color: var(--accent-cyan);">${c.total_score}</td>
                                    <td>
                                        <div class="degree-dot-row">
                                            ${degCounts[4] > 0 ? `<span class="degree-pill deg-4">${degCounts[4]}x 4th</span>` : ''}
                                            ${degCounts[3] > 0 ? `<span class="degree-pill deg-3">${degCounts[3]}x 3rd</span>` : ''}
                                            ${degCounts[2] > 0 ? `<span class="degree-pill deg-2">${degCounts[2]}x 2nd</span>` : ''}
                                            ${degCounts[1] > 0 ? `<span class="degree-pill deg-1">${degCounts[1]}x 1st</span>` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Inspect Remedy Modal Drawer
    window.inspectRemedy = async function(remedyId) {
        modalContent.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Loading clinical evidence & Materia Medica...</div>';
        modalBackdrop.style.display = 'flex';

        try {
            // Fetch explanation rationale and Materia Medica profile
            const expRes = await fetch(`/api/remedies/${remedyId}/explanation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symptoms: selectedSymptoms })
            });

            const mmRes = await fetch(`/api/materia-medica/${remedyId}`);

            const expData = await expRes.json();
            const mmData = mmRes.ok ? await mmRes.json() : null;

            renderRemedyModal(expData, mmData);
        } catch (err) {
            console.error('Modal fetch error:', err);
            modalContent.innerHTML = '<div style="padding: 20px; color: var(--accent-coral);">Error loading remedy detail profile.</div>';
        }
    };

    function renderRemedyModal(exp, mm) {
        let mmHtml = '<p style="font-size: 13px; color: var(--text-muted);">No specific Materia Medica sections linked in database.</p>';
        if (mm && mm.sections && mm.sections.length > 0) {
            mmHtml = mm.sections.slice(0, 5).map(sec => `
                <div style="background: rgba(11,15,25,0.6); padding: 12px; border-radius: 8px; margin-top: 10px; border: 1px solid var(--card-border);">
                    <h4 style="font-size: 13px; color: var(--accent-cyan); margin-bottom: 6px;">${escapeHtml(sec.heading)}</h4>
                    <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.6;">${escapeHtml(sec.content)}</p>
                </div>
            `).join('');
        }

        modalContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <span class="badge-tag">${exp.nameabbrev}</span>
                <h2 style="font-family: var(--font-heading); font-size: 24px; color: #fff; margin-top: 6px;">${escapeHtml(exp.namelong)}</h2>
                <div style="font-size: 13px; color: var(--accent-emerald); margin-top: 4px; font-weight: 600;">Totality Coverage: ${exp.coverage_pct}% | Weighted Score: ${exp.total_score}</div>
            </div>

            <!-- Traceable Clinical Rationale -->
            <div style="background: rgba(0, 230, 153, 0.08); border: 1px solid rgba(0, 230, 153, 0.2); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                <h3 style="font-size: 14px; color: var(--accent-emerald); margin-bottom: 8px;">Grounded Clinical Justification</h3>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.6; whitespace: pre-line;">${escapeHtml(exp.summary_rationale)}</div>
            </div>

            <!-- Matched Rubrics Table -->
            <div style="margin-bottom: 24px;">
                <h3 style="font-size: 14px; color: #fff; margin-bottom: 10px;">Matched Rubric Evidence Breakdown</h3>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${exp.matched_details.map(d => `
                        <div style="background: rgba(20,27,45,0.7); border: 1px solid var(--card-border); padding: 10px 14px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 12.5px; color: #fff; font-weight: 500;">${escapeHtml(d.rubric_text)}</div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                                    Hierarchy: <span style="color: var(--accent-cyan);">${d.hierarchy.toUpperCase()}</span> | Intensity: ${d.symptom_weight}
                                </div>
                            </div>
                            <span class="degree-pill deg-${d.remedy_degree}">${d.remedy_degree} Degree</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Materia Medica Excerpts -->
            <div>
                <h3 style="font-size: 14px; color: #fff; margin-bottom: 10px;">Materia Medica Keynotes & Sections (oorep)</h3>
                ${mmHtml}
            </div>
        `;
    }

    function closeModal() {
        modalBackdrop.style.display = 'none';
    }

    // Benchmark Case Presets
    async function loadPresetCase(preset) {
        clearAllSymptoms();
        if (preset === 'nux') {
            document.getElementById('patient_name').value = "Nux Vomica Benchmark Case";
            document.getElementById('chief_complaint').value = "Irritable, morning headache, stomach burning, gastric distress.";

            // Fetch representative rubrics for Nux
            const r1 = await fetchRubricId("irritability");
            const r2 = await fetchRubricId("headache");
            const r3 = await fetchRubricId("stomach");

            if (r1) addSymptom(r1.rubric_id, r1.fullpath, 'mental_general', 3, 'none');
            if (r2) addSymptom(r2.rubric_id, r2.fullpath, 'physical_general', 2, 'aggravation');
            if (r3) addSymptom(r3.rubric_id, r3.fullpath, 'particular', 2, 'none');
        } else if (preset === 'sulph') {
            document.getElementById('patient_name').value = "Sulphur Benchmark Case";
            document.getElementById('chief_complaint').value = "Heat sensations, warm generalities, stomach hunger.";

            const r1 = await fetchRubricId("abscess");
            const r2 = await fetchRubricId("stomach");

            if (r1) addSymptom(r1.rubric_id, r1.fullpath, 'physical_general', 3, 'none');
            if (r2) addSymptom(r2.rubric_id, r2.fullpath, 'particular', 2, 'none');
        } else if (preset === 'acon') {
            document.getElementById('patient_name').value = "Aconitum Benchmark Case";
            document.getElementById('chief_complaint').value = "Sudden anxiety, fear, restlessness.";

            const r1 = await fetchRubricId("anxiety");
            const r2 = await fetchRubricId("fear");

            if (r1) addSymptom(r1.rubric_id, r1.fullpath, 'mental_general', 3, 'aggravation');
            if (r2) addSymptom(r2.rubric_id, r2.fullpath, 'mental_general', 2, 'none');
        }

        setTimeout(runRepertorization, 300);
    }

    async function fetchRubricId(keyword) {
        try {
            const res = await fetch(`/api/rubrics/search?q=${keyword}&limit=1`);
            const data = await res.json();
            return data && data.length > 0 ? data[0] : null;
        } catch (e) {
            return null;
        }
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        const reg = new RegExp(`(${query})`, 'gi');
        return text.replace(reg, '<span style="color: #fff; font-weight: 700; background: rgba(0, 230, 153, 0.2); border-radius: 2px;">$1</span>');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
});
