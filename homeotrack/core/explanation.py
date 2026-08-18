from typing import Dict, Any
from homeotrack.core.ontology import RemedyRankResult, SymptomHierarchy


class ClinicalExplanationBuilder:
    """Builds transparent clinical rationale objects for remedy recommendations."""

    @staticmethod
    def build_remedy_explanation(candidate: RemedyRankResult) -> Dict[str, Any]:
        """Formats evidence breakdown and clinical justification for a ranked remedy candidate."""
        mental_matches = [d for d in candidate.matched_details if d.hierarchy == SymptomHierarchy.MENTAL_GENERAL]
        physical_matches = [d for d in candidate.matched_details if d.hierarchy == SymptomHierarchy.PHYSICAL_GENERAL]
        particular_matches = [d for d in candidate.matched_details if d.hierarchy == SymptomHierarchy.PARTICULAR]

        degree_counts = {1: 0, 2: 0, 3: 0, 4: 0}
        for d in candidate.matched_details:
            degree_counts[d.remedy_degree] = degree_counts.get(d.remedy_degree, 0) + 1

        rationale_lines = []
        rationale_lines.append(
            f"**{candidate.namelong}** ({candidate.nameabbrev}) covers **{candidate.matched_rubrics_count} of {candidate.total_rubrics_count}** selected rubrics ({candidate.coverage_pct}% totality coverage) with a weighted repertorization score of **{candidate.total_score}**."
        )

        if mental_matches:
            mental_details = ", ".join([f"'{m.rubric_text}' (Degree {m.remedy_degree})" for m in mental_matches])
            rationale_lines.append(f"• **Mental Generals**: Covers {len(mental_matches)} mental rubric(s): {mental_details}.")

        if physical_matches:
            physical_details = ", ".join([f"'{p.rubric_text}' (Degree {p.remedy_degree})" for p in physical_matches])
            rationale_lines.append(f"• **Physical Generals**: Covers {len(physical_matches)} physical rubric(s): {physical_details}.")

        if particular_matches:
            particular_details = ", ".join([f"'{p.rubric_text}' (Degree {p.remedy_degree})" for p in particular_matches])
            rationale_lines.append(f"• **Particular Symptoms**: Covers {len(particular_matches)} particular rubric(s): {particular_details}.")

        return {
            "remedy_id": candidate.remedy_id,
            "nameabbrev": candidate.nameabbrev,
            "namelong": candidate.namelong,
            "total_score": candidate.total_score,
            "coverage_pct": candidate.coverage_pct,
            "degree_counts": degree_counts,
            "summary_rationale": "\n".join(rationale_lines),
            "matched_details": [d.model_dump() for d in candidate.matched_details],
        }
