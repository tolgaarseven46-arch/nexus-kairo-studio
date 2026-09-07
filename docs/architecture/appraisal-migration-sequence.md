# Appraisal migration sequence

1. Freeze authority map.
2. Remove canonical-independent discourse reparses.
3. Define SocialAppraisal contract.
4. Move existing appraisal-like logic behind the contract without changing behavior.
5. Switch relationship and affect transitions to appraisal projections.
6. Remove appraisal-dependent shadow authority.
7. Add minimal dyadic social norm.
8. Add explicit zero-material-effect.
9. Add candidate readings.
10. Add contextual adjudication and novel falsification.

Stop condition: if novel scenarios require more than a small handful of special-case appraisal branches, reconsider the single-appraisal abstraction instead of continuing to patch it.
