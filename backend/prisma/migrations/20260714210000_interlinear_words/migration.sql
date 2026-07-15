-- Interlinear palavra-a-palavra (STEP Bible TAGNT/TAHOT, CC BY 4.0)
CREATE TABLE "InterlinearWord" (
    "id" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "translit" TEXT NOT NULL,
    "gloss" TEXT NOT NULL,
    "glossEs" TEXT,
    "strongId" TEXT NOT NULL,
    "morph" TEXT,
    "lemma" TEXT,
    "lemmaGloss" TEXT,

    CONSTRAINT "InterlinearWord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterlinearWord_bookId_chapter_verse_position_key"
    ON "InterlinearWord"("bookId", "chapter", "verse", "position");
CREATE INDEX "InterlinearWord_bookId_chapter_idx" ON "InterlinearWord"("bookId", "chapter");
CREATE INDEX "InterlinearWord_strongId_idx" ON "InterlinearWord"("strongId");
