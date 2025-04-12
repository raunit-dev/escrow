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
pub struct Take<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,
    #[account(mut)]
    pub maker: SystemAccount<'info>,
    #[account(
        mint::token_program = token_program
    )]
    pub mint_a: InterfaceAccount<'info, Mint>, 
    #[account(
        mint::token_program = token_program
    )]
    pub mint_b: InterfaceAccount<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = mint_b,
        associated_token::authority = taker,
        associated_token_program::token_program = token_program
    )]
    pub taker_mint_b_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        init_if_needed,
        payer = taker,
        associated_token::mint = mint_a,
        associated_token::authority = taker,
        associated_token_program::token_program = token_program
    )]
    pub taker_mint_a_ata: InterfaceAccount<'info, TokenAccount>,

    
    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = mint_b,
        associated_token::authority = maker,
        associated_token_program::token_program = token_program
    )]
    pub maker_mint_b_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        has_one = mint_a,
        has_one = maker,
        payer = taker,
        seeds = [b"escrow", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowState>, // This is the escrow state PDA.

    #[account(
        associated_token::mint = mint_a,
        associated_token::authority = escrow,
        associated_token_program::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>, // The vault holding the escrowed tokens.

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>
}

impl<'info> Take<'info> {


        pub fn deposit(&mut self, amount: u64, decimals: u8) -> Result<()> {
            let cpi_program = self.token_program.to_account_info();
            let transfer_accounts = TransferChecked {
                from: self.taker_mint_b_ata.to_account_info(),
                mint: self.mint_b.to_account_info(),
                to: self.maker_mint_b_ata.to_account_info(),
                authority: self.taker.to_account_info(), // The maker is the authority for this transfer.
            };
    
            let cpi_ctx = CpiContext::new(cpi_program, transfer_accounts);//creating an context 
            transfer_checked(cpi_ctx, amount, decimals)?;
            Ok(())
        }


        pub fn withdraw(&mut self, amount: u64, decimals: u8) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[
            &[
                b"escrow",
                self.maker.to_account_info().key().as_ref(),
                &self.escrow.seeds.to_le_bytes()[..],
                &[self.escrow.bump],
            ],
        ];
        let cpi_program = self.token_program.to_account_info();
        let transfer_accounts = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.mint_a.to_account_info(),
            to: self.taker_mint_a_ata.to_account_info(),
            authority: self.escrow.to_account_info(), // The maker is the authority for this transfer.
        };

        let cpi_ctx = CpiContext::new_with_signer(self.token_program.to_account_info(),transfer_accounts, &signer_seeds);//creating an context 
        transfer_checked(cpi_ctx,self.vault.amount, self.mint_a.decimals)?;
            Ok(())
        }
     
        pub fn close_vault(&mut self) -> Result<()> {


            let signer_seeds: [&[&[u8]]] = &[&[
            b"escrow",
            self.maker.to_account_info().key().as_ref(),
            &self.escrow.seeds.to_le_bytes()[..],
            &[self.escrow.bump],
        ]];

            let close_accounts = CloseAccount {
                account:self.vault.to_account_info(),
                destination: self.taker.to_account_info(),
                authority: self.escrow.to_account_info(),
            };
    
            let close_cpi_ctx = CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                close_accounts,
                &signer_seeds,
            );
            close_account(close_cpi_ctx)
    
    
        }



        
        
    }