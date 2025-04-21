import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { 
  getAssociatedTokenAddressSync, 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;
  
  const maker = provider.wallet;
  const taker = anchor.web3.Keypair.generate();
  const seed = new BN(8888);
  const receiveAmount = new BN(1_000_000);
  const amount = new BN(1_000_000);
  let mintA: anchor.web3.PublicKey;
  let mintB: anchor.web3.PublicKey;
  let makerMintAAta: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;
  let makerMintBAta: anchor.web3.PublicKey;
  let takerMintAAta: anchor.web3.PublicKey;
  let takerMintBAta: anchor.web3.PublicKey;
  
  const [escrow, escrowBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), maker.publicKey.toBuffer(), seed.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  before(async () => {

    mintA = await createMint(
      provider.connection,
      maker.payer,
      maker.publicKey,
      null,
      6
    );
    
    mintB = await createMint(
      provider.connection,
      maker.payer,
      maker.publicKey,
      null,
      6
    );
    
    const makerMintAAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintA,
      maker.publicKey
    );
    makerMintAAta = makerMintAAccount.address;

    const makerMintBAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintB,
      maker.publicKey
    );
    makerMintBAta = makerMintBAccount.address;

    const takerMintAAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintA,
      taker.publicKey
    );
    takerMintAAta = takerMintAAccount.address;

    const takerMintBAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintB,
      taker.publicKey
    );
    takerMintBAta = takerMintBAccount.address;
    
    await mintTo(
      provider.connection,
      maker.payer,
      mintA,
      makerMintAAta,
      maker.publicKey,
      2_000_000
    );

    await mintTo(
      provider.connection,
      maker.payer,
      mintB,
      takerMintBAta,
      maker.publicKey,
      2_000_000
    )
    
    vault = getAssociatedTokenAddressSync(
      mintA,
      escrow,
      true
    );
  });

  it("Creates escrow and deposits tokens", async () => {


    const tx = await program.methods
      .make(
        seed,
        amount,
        receiveAmount,
      )
      .accountsPartial({
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        makerMintAAta: makerMintAAta,
        escrow: escrow,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .rpc();
  
    console.log("\nYour transaction signature", tx);
    
    const escrowAccount = await program.account.escrowState.fetch(escrow);
    console.log("Escrow account:", escrowAccount);
    
    const vaultInfo = await provider.connection.getTokenAccountBalance(vault);
    console.log("Vault token balance:", vaultInfo.value.uiAmount);
  });

  it("take and close vault", async () => {
   
    const tx = await program.methods
      .take()
      .accountsPartial({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintB: mintB,
        mintA: mintA,
        takerMintBAta: takerMintBAta,
        takerMintAAta : takerMintAAta,
        makerMintBAta : makerMintBAta,
        escrow: escrow,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();
    console.log("\nYour transaction signature", tx);
  });
  
  it("refund tokens and close escrow", async () => {

    const refundseed = new BN(6969);
    const refundreceive = new BN(1_000_000);

    const [refundescrow, refundescrowBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), refundseed.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const refundvault = getAssociatedTokenAddressSync(
      mintA,
      refundescrow,
      true
    );
  
   
     await program.methods
      .make(
        refundseed,
        refundreceive,
        refundreceive
      )
      .accountsPartial({
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        makerMintAAta: makerMintAAta,
        escrow: refundescrow,
        vault: refundvault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .rpc();


      const tx = await program.methods
      .take()
      .accountsPartial({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintB: mintB,
        mintA: mintA,
        takerMintBAta: takerMintBAta,
        takerMintAAta : takerMintAAta,
        makerMintBAta : makerMintBAta,
        escrow: refundescrow,
        vault: refundvault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();
      console.log("refund  complete:", tx);
  });

  
  });