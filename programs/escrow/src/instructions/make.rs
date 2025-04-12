use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::state::EscrowState;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Make<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        mint::token_program = token_program
    )]
    pub mint_a: InterfaceAccount<'info, Mint>, // Token that the maker is offering (e.g., USDC).

    #[account(
        mint::token_program = token_program
    )]
    pub mint_b: InterfaceAccount<'info, Mint>, // Token that the maker wants (e.g., USDT).

    #[account(
        init_if_needed,
        payer = maker,
        associated_token::mint = mint_a,
        associated_token::authority = maker,
    )]
    pub maker_mint_a_ata: InterfaceAccount<'info, TokenAccount>, // Maker's token account for mint_a.

    #[account(
        init,
        payer = maker,
        space = EscrowState::INIT_SPACE,
        seeds = [b"escrow", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowState>, // Escrow state PDA.

    #[account(
        init,
        associated_token::mint = mint_a,
        associated_token::authority = escrow,
        payer = maker
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>, // Vault holding the escrowed tokens.

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> Make<'info> {
    pub fn init_escrow_state(
        &mut self,
        seed: u64,
        receive_amount: u64,
        bump: u8,
    ) -> Result<()> {
        self.escrow.set_inner(EscrowState {
            seeds,
            maker: self.maker.key(),
            mint_a: self.mint_a.key(),
            mint_b: self.mint_b.key(),
            recieve_amount,
            bump,
        });
        Ok(())
    }

    pub fn deposit(&mut self, amount: u64, decimals: u8) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let transfer_accounts = TransferChecked {
            from: self.maker_mint_a_ata.to_account_info(),
            mint: self.mint_a.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, transfer_accounts);
        transfer_checked(cpi_ctx, amount, decimals)?;
        Ok(())
    }
}