use anchor_lang::
    prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use anchor_spl::token_interface::{CloseAccount, close_account};

use crate::state::EscrowState;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Refund<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(mint::token_program = token_program)]
    pub mint_a: InterfaceAccount<'info, Mint>, 
    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = maker,
    )]
    pub maker_mint_a_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        has_one = mint_a,
        has_one = maker,
        seeds = [b"escrow", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowState>, 
    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = escrow,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>, // The vault holding the escrowed tokens.

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>
}

impl<'info> Refund <'info> {
    pub fn refund_and_close_vault(&mut self) -> Result<()> {

        let user_key = self.maker.key();
        let seeds = &[
            b"escrow",
            user_key.as_ref(),
            &self.escrow.seeds.to_le_bytes()[..],
            &[self.escrow.bump]
        ];
         
         let signer_seeds = &[&seeds[..]];
        let cpi_program = self.token_program.to_account_info();
        let transfer_accounts = TransferChecked {
            from: self.maker_mint_a_ata.to_account_info(),
            mint: self.mint_a.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(), // The maker is the authority for this transfer.
        };

        let cpi_ctx = CpiContext::new_with_signer(cpi_program,transfer_accounts, signer_seeds);//creating an context 
        transfer_checked(cpi_ctx,self.vault.amount, self.mint_a.decimals)?;
        

        let close_accounts = CloseAccount {
            account:self.vault.to_account_info(),
            destination: self.maker.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let close_cpi_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            close_accounts,
            signer_seeds,
        );
        close_account(close_cpi_ctx)


    }
}