from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from homeotrack.database.models import Remedy, MMChapter, MMSection, MMInfo


class MateriaMedicaService:
    """Service to fetch Materia Medica narratives, keynotes, and chapter sections."""

    def __init__(self, db: Session):
        self.db = db

    def get_remedy_profile(self, remedy_id: int) -> Optional[Dict[str, Any]]:
        """Fetch remedy master record and linked Materia Medica sections."""
        remedy = self.db.query(Remedy).filter(Remedy.id == remedy_id).first()
        if not remedy:
            return None

        # Fetch linked MM Chapters for this remedy
        chapters = self.db.query(MMChapter).filter(MMChapter.remedy_id == remedy_id).all()
        chapter_ids = [c.id for c in chapters]

        sections = []
        if chapter_ids:
            raw_sections = (
                self.db.query(MMSection)
                .filter(MMSection.mmchapter_id.in_(chapter_ids))
                .order_by(MMSection.id.asc())
                .all()
            )
            for s in raw_sections:
                if s.content and len(s.content.strip()) > 0:
                    sections.append({
                        "id": s.id,
                        "heading": s.heading,
                        "content": s.content.strip()
                    })

        return {
            "remedy_id": remedy.id,
            "nameabbrev": remedy.nameabbrev,
            "namelong": remedy.namelong,
            "namealt": remedy.namealt,
            "chapters_count": len(chapters),
            "sections": sections
        }

    def search_materia_medica_by_keyword(self, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search Materia Medica sections containing a specific keyword (e.g. 'irritability', 'burning')."""
        sections = (
            self.db.query(MMSection)
            .filter(MMSection.content.ilike(f"%{keyword}%"))
            .limit(limit)
            .all()
        )
        results = []
        for s in sections:
            results.append({
                "section_id": s.id,
                "heading": s.heading,
                "content_snippet": s.content[:300] + ("..." if len(s.content) > 300 else "")
            })
        return results
