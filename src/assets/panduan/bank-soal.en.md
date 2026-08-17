# Recruitment Question Bank

The pool of entrance-test questions, reused for every recruitment round.

The questions are **essays** — they call for an explanation, not a choice — and
are marked by a person. No answer key is stored here.

## Who can open it

Only the **HR division** and the **owner**. Seniority alone is not enough: a
General Manager without the HR division is still refused, exactly as with
payslips.

The reason is not the secrecy of the questions but what sits beside them —
candidates' answers and their marks, which decide whether someone is hired.

## Test packages

Questions are grouped into **test packages**. One package is one complete test
paper with its own duration.

The questions carried over from the old system form four packages, each holding
three categories:

| Category | Contents |
|---|---|
| `civil` | General civil engineering — concrete, rebar, methods |
| `geo` | Geotechnics — bearing capacity, soil investigation, foundations |
| `drawing` | Technical drawing; accepts file uploads |

## Adding a question

Press **Add question**, choose the package, then write the question.

**Order does not need to be set.** A new question is placed after the existing
ones.

**Notes** carry the standard or constraint the answer must follow — for
instance "Follow the minimum standard of SNI-03-2874-2002". Notes are searched
along with the question text, so some questions can only be found through them.

**Attachment** holds HTML: rebar weight tables, section drawings, and the like
— material that belongs with the question and means nothing apart from it.

## Accepting file uploads

Switches on by itself when the category is `drawing`, and can still be edited.

Better left **off** elsewhere. Enabling it on essay questions invites answers
sent as photographs of handwriting — and handwriting on a phone screen is often
unreadable when the time comes to mark it.

## Editing a question

The test package **cannot be changed** once the question exists. Moving it
would collide with the numbering in the destination package while existing
answers still point at this question — so a single answer sheet would carry
questions from two different tests.

If a question truly belongs elsewhere, create it there and delete the old one.

## Deleting a question

Questions are **marked deleted**, not removed from the database.

Candidates' answers point at them. Removing the row would leave a marked answer
sheet without its question — and a mark without its question cannot be reviewed
by anyone, including whoever awarded it.

Deleting requires **level 5**.

## Worth remembering

- A question in use on a running test can still be edited; anyone who already
  opened the paper sees the old version until they reload
- The maximum score sets the question's weight during marking; every question
  carried over from the old system is worth 5
- Search covers both the question text **and** its notes
