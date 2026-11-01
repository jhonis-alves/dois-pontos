-- 004_card_settlement.sql
-- Conta interna usada para liquidar faturas sem dupla contabilização.
-- Contas com system_kind preenchido não aparecem nas listagens do usuário.

ALTER TABLE accounts ADD COLUMN system_kind TEXT;

CREATE UNIQUE INDEX ux_accounts_system_kind
  ON accounts(space_id, system_kind)
  WHERE system_kind IS NOT NULL;
